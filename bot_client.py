"""
Bot Client - HTTP/WS 客户端与 Node.js Mineflayer Bot 服务通信
移植自 LLM_MC backend/app/bot/client.py
"""
import httpx
import asyncio
import json
from typing import Dict, Any, Optional, Callable, List

from astrbot.core import logger


class BotClient:
    """Client for communicating with the Node.js Mineflayer bot service"""
    
    def __init__(self, http_url: str = "http://localhost:3001", ws_url: str = ""):
        self.base_url = http_url
        self.ws_url = ws_url or http_url.replace("http://", "ws://").replace("https://", "wss://")
        self.http_client: Optional[httpx.AsyncClient] = None
        self.ws_connection = None
        self.event_handlers: List[Callable] = []
        self._ws_task: Optional[asyncio.Task] = None
        self._event_waiters: List[Dict[str, Any]] = []
    
    async def init(self):
        """Initialize the HTTP client"""
        self.http_client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(
                connect=10.0,
                read=300.0,
                write=10.0,
                pool=10.0
            )
        )
    
    async def close(self):
        """Close connections"""
        if self._ws_task:
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        if self.ws_connection:
            await self.ws_connection.close()
        if self.http_client:
            await self.http_client.aclose()
    
    # ========== HTTP API Methods ==========
    
    async def get_status(self) -> Dict[str, Any]:
        """Get bot status"""
        response = await self.http_client.get("/status")
        response.raise_for_status()
        return response.json()
    
    async def get_observation(self) -> Dict[str, Any]:
        """Get current observation from bot"""
        response = await self.http_client.get("/observation")
        response.raise_for_status()
        return response.json()
    
    async def execute_action(
        self, 
        action: str, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute an action on the bot"""
        payload = {
            "action": action,
            "parameters": parameters or {}
        }
        response = await self.http_client.post("/action", json=payload)
        response.raise_for_status()
        return response.json()
    
    async def connect_mc(self) -> Dict[str, Any]:
        """Tell bot to connect to Minecraft server"""
        response = await self.http_client.post("/connect")
        response.raise_for_status()
        return response.json()
    
    async def disconnect_mc(self) -> Dict[str, Any]:
        """Tell bot to disconnect from Minecraft server"""
        response = await self.http_client.post("/disconnect")
        response.raise_for_status()
        return response.json()
    
    async def health_check(self) -> bool:
        """Check if bot service is healthy"""
        try:
            response = await self.http_client.get("/health")
            return response.status_code == 200
        except Exception:
            return False
    
    # ========== WebSocket Methods ==========
    
    def add_event_handler(self, handler: Callable):
        """Add an event handler for WebSocket events"""
        self.event_handlers.append(handler)
    
    def remove_event_handler(self, handler: Callable):
        """Remove an event handler"""
        if handler in self.event_handlers:
            self.event_handlers.remove(handler)
    
    async def start_ws_listener(self):
        """Start listening for WebSocket events"""
        self._ws_task = asyncio.create_task(self._ws_loop())
    
    async def _ws_loop(self):
        """WebSocket event loop with auto-reconnect"""
        try:
            import websockets
        except ImportError:
            logger.error("[LLMMC] websockets 库未安装，无法监听 Bot 事件。请安装: pip install websockets")
            return
        
        while True:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    self.ws_connection = ws
                    logger.info(f"[LLMMC] WebSocket 已连接到 {self.ws_url}")
                    
                    async for message in ws:
                        try:
                            event = json.loads(message)
                            await self._handle_event(event)
                        except json.JSONDecodeError:
                            logger.warning(f"[LLMMC] Invalid JSON from WS: {message[:100]}")
                            
            except asyncio.CancelledError:
                logger.info("[LLMMC] WebSocket listener cancelled")
                return
            except Exception as e:
                logger.warning(f"[LLMMC] WebSocket 断开: {e}, 5秒后重连...")
                await asyncio.sleep(5)
    
    async def _handle_event(self, event: Dict[str, Any]):
        """Handle incoming WebSocket event"""
        await self._check_event_waiters(event)
        
        for handler in self.event_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"[LLMMC] Event handler error: {e}")
    
    async def _check_event_waiters(self, event: Dict[str, Any]):
        """检查并触发匹配的事件等待器"""
        event_type = event.get("type")
        waiters_to_remove = []
        
        for waiter in self._event_waiters:
            if waiter["event_type"] != event_type:
                continue
            
            filter_func = waiter.get("filter")
            if filter_func:
                try:
                    if not filter_func(event):
                        continue
                except Exception:
                    continue
            
            if not waiter["future"].done():
                waiter["future"].set_result(event)
            waiters_to_remove.append(waiter)
        
        for waiter in waiters_to_remove:
            if waiter in self._event_waiters:
                self._event_waiters.remove(waiter)
    
    async def wait_for_event(
        self,
        event_type: str,
        filter_func: Optional[Callable[[Dict[str, Any]], bool]] = None,
        timeout: float = 30.0
    ) -> Optional[Dict[str, Any]]:
        """等待特定类型的事件"""
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        
        waiter = {
            "event_type": event_type,
            "filter": filter_func,
            "future": future
        }
        self._event_waiters.append(waiter)
        
        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            if waiter in self._event_waiters:
                self._event_waiters.remove(waiter)
            return None
    
    def cancel_all_waiters(self):
        """取消所有事件等待器"""
        for waiter in self._event_waiters:
            if not waiter["future"].done():
                waiter["future"].cancel()
        self._event_waiters.clear()
