"""
Script Executor - BotAPI 封装 + 安全的 Python 脚本执行器
移植自 LLM_MC backend/app/script/executor.py
"""
import asyncio
import traceback
from typing import Dict, Any, Optional, List
from io import StringIO
import sys

from astrbot.core import logger


class BotAPI:
    """
    Safe Bot API wrapper for script execution.
    Provides async methods that scripts can call.
    """
    
    def __init__(self, bot_client, skill_manager=None):
        self._bot_client = bot_client
        self._skill_manager = skill_manager
        self.results = []
        self.logs = []
    
    def log(self, message: str):
        self.logs.append(str(message))
    
    # ===== 基础动作 =====
    
    async def chat(self, message: str) -> Dict[str, Any]:
        """发送聊天消息"""
        result = await self._bot_client.execute_action("chat", {"message": message})
        self.results.append({"action": "chat", "result": result})
        return result
    
    async def goTo(self, x: int, y: int, z: int) -> Dict[str, Any]:
        """移动到指定坐标"""
        result = await self._bot_client.execute_action("goTo", {"x": x, "y": y, "z": z})
        self.results.append({"action": "goTo", "result": result})
        return result
    
    async def followPlayer(self, playerName: str) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("followPlayer", {"playerName": playerName})
        self.results.append({"action": "followPlayer", "result": result})
        return result
    
    async def stopMoving(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("stopMoving", {})
        self.results.append({"action": "stopMoving", "result": result})
        return result
    
    async def jump(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("jump", {})
        self.results.append({"action": "jump", "result": result})
        return result
    
    async def lookAt(self, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("lookAt", {"x": x, "y": y, "z": z})
        self.results.append({"action": "lookAt", "result": result})
        return result
    
    async def attack(self, entityType: str) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("attack", {"entityType": entityType})
        self.results.append({"action": "attack", "result": result})
        return result
    
    async def collectBlock(self, blockType: str) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("collectBlock", {"blockType": blockType})
        self.results.append({"action": "collectBlock", "result": result})
        return result
    
    async def wait(self, seconds: float) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("wait", {"seconds": seconds})
        self.results.append({"action": "wait", "result": result})
        return result
    
    # ===== 物品栏 =====
    
    async def viewInventory(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("viewInventory", {})
        self.results.append({"action": "viewInventory", "result": result})
        return result
    
    async def equipItem(self, itemName: str) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("equipItem", {"itemName": itemName})
        self.results.append({"action": "equipItem", "result": result})
        return result
    
    async def dropItem(self, itemName: str, count: int = None) -> Dict[str, Any]:
        params = {"itemName": itemName}
        if count is not None:
            params["count"] = count
        result = await self._bot_client.execute_action("dropItem", params)
        self.results.append({"action": "dropItem", "result": result})
        return result
    
    async def eat(self, foodName: str = None) -> Dict[str, Any]:
        params = {}
        if foodName:
            params["foodName"] = foodName
        result = await self._bot_client.execute_action("eat", params)
        self.results.append({"action": "eat", "result": result})
        return result
    
    async def useItem(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("useItem", {})
        self.results.append({"action": "useItem", "result": result})
        return result
    
    async def placeBlock(self, blockName: str, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("placeBlock", {"blockName": blockName, "x": x, "y": y, "z": z})
        self.results.append({"action": "placeBlock", "result": result})
        return result
    
    async def activateBlock(self, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("activateBlock", {"x": x, "y": y, "z": z})
        self.results.append({"action": "activateBlock", "result": result})
        return result
    
    # ===== 环境感知 =====
    
    async def scanBlocks(self, blockTypes: list, range: int = 16) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("scanBlocks", {"blockTypes": blockTypes, "range": range})
        self.results.append({"action": "scanBlocks", "result": result})
        return result
    
    async def findBlock(self, blockType: str, maxDistance: int = 32) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("findBlock", {"blockType": blockType, "maxDistance": maxDistance})
        self.results.append({"action": "findBlock", "result": result})
        return result
    
    async def getBlockAt(self, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("getBlockAt", {"x": x, "y": y, "z": z})
        self.results.append({"action": "getBlockAt", "result": result})
        return result
    
    async def scanEntities(self, range: int = 16, entityType: str = None) -> Dict[str, Any]:
        params = {"range": range}
        if entityType:
            params["entityType"] = entityType
        result = await self._bot_client.execute_action("scanEntities", params)
        self.results.append({"action": "scanEntities", "result": result})
        return result
    
    async def listPlayers(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("listPlayers", {})
        self.results.append({"action": "listPlayers", "result": result})
        return result
    
    async def canReach(self, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("canReach", {"x": x, "y": y, "z": z})
        self.results.append({"action": "canReach", "result": result})
        return result
    
    # ===== 合成 =====
    
    async def craft(self, itemName: str, count: int = 1) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("craft", {"itemName": itemName, "count": count})
        self.results.append({"action": "craft", "result": result})
        return result
    
    async def listRecipes(self, itemName: str) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("listRecipes", {"itemName": itemName})
        self.results.append({"action": "listRecipes", "result": result})
        return result
    
    async def smelt(self, itemName: str, fuelName: str = None, count: int = 1) -> Dict[str, Any]:
        params = {"itemName": itemName, "count": count}
        if fuelName:
            params["fuelName"] = fuelName
        result = await self._bot_client.execute_action("smelt", params)
        self.results.append({"action": "smelt", "result": result})
        return result
    
    # ===== 容器 =====
    
    async def openContainer(self, x: int, y: int, z: int) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("openContainer", {"x": x, "y": y, "z": z})
        self.results.append({"action": "openContainer", "result": result})
        return result
    
    async def closeContainer(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("closeContainer", {})
        self.results.append({"action": "closeContainer", "result": result})
        return result
    
    async def depositItem(self, itemName: str, count: int = None) -> Dict[str, Any]:
        params = {"itemName": itemName}
        if count is not None:
            params["count"] = count
        result = await self._bot_client.execute_action("depositItem", params)
        self.results.append({"action": "depositItem", "result": result})
        return result
    
    async def withdrawItem(self, itemName: str, count: int = None) -> Dict[str, Any]:
        params = {"itemName": itemName}
        if count is not None:
            params["count"] = count
        result = await self._bot_client.execute_action("withdrawItem", params)
        self.results.append({"action": "withdrawItem", "result": result})
        return result
    
    # ===== 实体交互 =====
    
    async def mountEntity(self, entityType: str = None) -> Dict[str, Any]:
        params = {}
        if entityType:
            params["entityType"] = entityType
        result = await self._bot_client.execute_action("mountEntity", params)
        self.results.append({"action": "mountEntity", "result": result})
        return result
    
    async def dismount(self) -> Dict[str, Any]:
        result = await self._bot_client.execute_action("dismount", {})
        self.results.append({"action": "dismount", "result": result})
        return result
    
    async def useOnEntity(self, entityType: str, hand: str = "hand") -> Dict[str, Any]:
        result = await self._bot_client.execute_action("useOnEntity", {"entityType": entityType, "hand": hand})
        self.results.append({"action": "useOnEntity", "result": result})
        return result
    
    # ===== 观测 =====
    
    async def getObservation(self) -> Dict[str, Any]:
        return await self._bot_client.get_observation()
    
    async def getStatus(self) -> Dict[str, Any]:
        return await self._bot_client.get_status()
    
    async def getPosition(self) -> Dict[str, Any]:
        obs = await self._bot_client.get_observation()
        return obs.get("position", {"x": 0, "y": 0, "z": 0})
    
    async def getHealth(self) -> Dict[str, Any]:
        obs = await self._bot_client.get_observation()
        return obs.get("health", {"health": 20, "food": 20})
    
    # ===== 事件等待 =====
    
    async def waitForEvent(self, event_type: str, filter_func=None, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        self.log(f"等待事件: {event_type} (超时: {timeout}秒)")
        result = await self._bot_client.wait_for_event(event_type, filter_func, timeout)
        if result:
            self.log(f"收到事件: {event_type}")
        else:
            self.log(f"等待事件超时: {event_type}")
        return result
    
    async def waitForChat(self, from_player: str = None, contains: str = None, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        def filter_func(e):
            if from_player and e.get("username") != from_player:
                return False
            if contains and contains.lower() not in e.get("message", "").lower():
                return False
            return True
        return await self.waitForEvent("chat", filter_func, timeout)
    
    # ===== 技能 =====
    
    def listSkills(self) -> List[Dict[str, Any]]:
        if not self._skill_manager:
            return []
        return self._skill_manager.list_skills()
    
    def getSkill(self, name: str) -> Optional[Dict[str, Any]]:
        if not self._skill_manager:
            return None
        return self._skill_manager.get_skill(name)
    
    def saveSkill(self, name: str, description: str, code: str, params: List[str] = None) -> Dict[str, Any]:
        if not self._skill_manager:
            return {"success": False, "error": "技能管理器未初始化"}
        return self._skill_manager.save_skill(name, description, code, params or [])
    
    def deleteSkill(self, name: str) -> Dict[str, Any]:
        if not self._skill_manager:
            return {"success": False, "error": "技能管理器未初始化"}
        return self._skill_manager.delete_skill(name)
    
    async def useSkill(self, name: str, **kwargs) -> Any:
        if not self._skill_manager:
            return {"success": False, "error": "技能管理器未初始化"}
        skill = self._skill_manager.get_skill(name)
        if not skill:
            return {"success": False, "error": f"技能 '{name}' 不存在"}
        self.log(f"执行技能: {name}")
        try:
            full_code = skill.get('full_code', '')
            skill_globals = {
                '__builtins__': _SAFE_BUILTINS,
                'asyncio': asyncio,
            }
            skill_locals = {}
            exec(compile(full_code, f'<skill:{name}>', 'exec'), skill_globals, skill_locals)
            func_name = self._skill_manager._safe_func_name(name)
            if func_name not in skill_locals:
                return {"success": False, "error": f"技能函数 {func_name} 未定义"}
            result = await skill_locals[func_name](self, **kwargs)
            self.results.append({"action": f"skill:{name}", "result": result})
            return result
        except Exception as e:
            return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


# 安全的 builtins
_SAFE_BUILTINS = {
    'print': print, 'len': len, 'range': range, 'str': str, 'int': int,
    'float': float, 'bool': bool, 'list': list, 'dict': dict, 'tuple': tuple,
    'set': set, 'abs': abs, 'min': min, 'max': max, 'sum': sum, 'round': round,
    'sorted': sorted, 'enumerate': enumerate, 'zip': zip, 'map': map,
    'filter': filter, 'isinstance': isinstance, 'True': True, 'False': False, 'None': None,
}


class ScriptExecutor:
    """Safe Python script executor with timeout and restrictions"""
    
    def __init__(self, bot_client, skill_manager=None, timeout: float = 300.0):
        self._bot_client = bot_client
        self._skill_manager = skill_manager
        self.timeout = timeout
    
    async def execute(self, script: str, timeout: Optional[float] = None) -> Dict[str, Any]:
        """Execute Python script code. Script must define async main(bot)."""
        bot_api = BotAPI(self._bot_client, self._skill_manager)
        effective_timeout = timeout if timeout is not None else self.timeout
        
        old_stdout = sys.stdout
        sys.stdout = mystdout = StringIO()
        
        try:
            safe_globals = {
                '__builtins__': _SAFE_BUILTINS,
                'asyncio': asyncio,
                'bot': bot_api,
            }
            safe_locals = {}
            exec(compile(script, '<script>', 'exec'), safe_globals, safe_locals)
            
            if 'main' not in safe_locals:
                return {"success": False, "error": "Script must define an async function 'main(bot)'", "logs": bot_api.logs}
            
            import time
            start_time = time.time()
            try:
                result = await asyncio.wait_for(safe_locals['main'](bot_api), timeout=effective_timeout)
            except asyncio.TimeoutError:
                return {"success": False, "error": f"Script timed out after {effective_timeout}s",
                        "logs": bot_api.logs, "actions": bot_api.results}
            
            output = mystdout.getvalue()
            return {
                "success": True, "result": result, "output": output,
                "logs": bot_api.logs, "actions": bot_api.results,
                "action_count": len(bot_api.results),
                "execution_time": round(time.time() - start_time, 2)
            }
        except SyntaxError as e:
            return {"success": False, "error": f"Syntax error: {e}", "logs": bot_api.logs}
        except Exception as e:
            return {"success": False, "error": f"Execution error: {e}",
                    "traceback": traceback.format_exc(), "logs": bot_api.logs, "actions": bot_api.results}
        finally:
            sys.stdout = old_stdout
