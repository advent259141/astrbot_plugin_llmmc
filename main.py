"""
AstrBot Plugin: LLM-MC
将 LLM_MC 的 Minecraft Bot 控制能力集成到 AstrBot，
实现 MC 聊天与 QQ 群上下文互通，LLM 通过工具调用控制 Bot。
"""
import asyncio
import json
from typing import Optional, Dict, Any

from astrbot.api.event import filter, AstrMessageEvent
from astrbot.api.star import Context, Star, register
from astrbot.api.message_components import Plain
from astrbot.api.platform import MessageMember
from astrbot.api import logger

from .bot_client import BotClient
from .task_manager import TaskManager, TaskStatus
from .skill_manager import SkillManager
from .script_executor import ScriptExecutor


@register(
    "astrbot_plugin_llmmc",
    "LLMMC",
    "LLM-MC Minecraft Bot 插件 - MC/QQ上下文互通 + LLM工具控制Bot",
    "0.1.0",
    "",
)
class LLMMCPlugin(Star):
    def __init__(self, context: Context, config: dict):
        super().__init__(context)
        self.config = config
        
        # Bot 服务配置
        self.auto_start_bot = config.get("auto_start_bot", True)
        self.bot_dir = config.get("bot_dir", "")
        self.bot_service_port = config.get("bot_service_port", 3001)
        
        # MC 服务器配置
        self.mc_host = config.get("mc_host", "localhost")
        self.mc_port = config.get("mc_port", 25565)
        self.mc_username = config.get("mc_username", "LLM_Bot")
        self.mc_version = config.get("mc_version", "1.20.1")
        self.auto_connect = config.get("auto_connect", False)
        self.viewer_enabled = config.get("viewer_enabled", False)
        self.viewer_port = config.get("viewer_port", 3007)
        
        # 自动启动时根据端口生成 URL，否则用用户配置
        if self.auto_start_bot:
            self.bot_http_url = f"http://localhost:{self.bot_service_port}"
        else:
            self.bot_http_url = config.get("bot_http_url", f"http://localhost:{self.bot_service_port}")
        self.bot_ws_url = config.get("bot_ws_url", "")
        
        # AstrBot 集成配置
        self.unified_group_umo = config.get("unified_group_umo", "")
        self.bot_nickname = config.get("bot_nickname", "小面包")
        self.enable_chat_response = config.get("enable_chat_response", True)
        self.enable_agent_loop = config.get("enable_agent_loop", False)
        self.agent_tick_rate = config.get("agent_tick_rate", 5)
        self.health_threshold = config.get("health_threshold", 6)
        self.food_threshold = config.get("food_threshold", 4)
        
        # 从 UMO 中提取 session_id
        self.session_id = ""
        self.group_id = ""
        if self.unified_group_umo:
            parts = self.unified_group_umo.split(":")
            if len(parts) == 3:
                self.session_id = parts[2]
                self.group_id = parts[2]
        
        # 核心组件
        self.bot_client: Optional[BotClient] = None
        self.task_manager: Optional[TaskManager] = None
        self.skill_manager: Optional[SkillManager] = None
        self.script_executor: Optional[ScriptExecutor] = None
        
        # 子进程 & Agent loop
        self._bot_process = None
        self._agent_task: Optional[asyncio.Task] = None
        self._last_health_alert = 0
        self._last_food_alert = 0

    
    async def initialize(self):
        """插件初始化"""
        # 自动启动 Bot 服务
        if self.auto_start_bot:
            await self._start_bot_service()
        
        # 初始化 Bot 客户端
        self.bot_client = BotClient(self.bot_http_url, self.bot_ws_url)
        await self.bot_client.init()
        
        # 初始化管理器
        from astrbot.core.star.star_tools import StarTools
        data_dir = StarTools.get_data_dir("astrbot_plugin_llmmc")
        skills_data_dir = f"{data_dir}/skills"
        
        # 首次运行时，将插件自带的技能复制到数据目录
        self._migrate_bundled_skills(skills_data_dir)
        
        self.task_manager = TaskManager()
        self.skill_manager = SkillManager(skills_data_dir)
        self.script_executor = ScriptExecutor(self.bot_client, self.skill_manager)
        
        # 设置任务完成回调
        self.task_manager.set_on_complete_callback(self._on_task_complete)
        
        # 注册 WS 事件处理器并启动监听
        self.bot_client.add_event_handler(self._on_bot_event)
        await self.bot_client.start_ws_listener()
        
        # 启动 Agent Loop（如果启用）
        if self.enable_agent_loop:
            self._agent_task = asyncio.create_task(self._agent_loop())
            logger.info("[LLMMC] Agent Loop 已启动")
        
        logger.info(f"[LLMMC] 插件已初始化 | Bot: {self.bot_http_url} | 群绑定: {self.session_id or '未配置'}")
    
    async def terminate(self):
        """插件关闭"""
        if self._agent_task:
            self._agent_task.cancel()
            try:
                await self._agent_task
            except asyncio.CancelledError:
                pass
        if self.task_manager:
            await self.task_manager.cancel_all_tasks()
        if self.bot_client:
            await self.bot_client.close()
        # 停止 Bot 子进程
        await self._stop_bot_service()
        logger.info("[LLMMC] 插件已关闭")
    
    async def _start_bot_service(self):
        """启动 Node.js Bot 服务子进程"""
        import subprocess
        import os
        from pathlib import Path
        
        # 解析 bot 目录
        if self.bot_dir:
            bot_path = Path(self.bot_dir)
        else:
            # 默认：插件自身目录下的 bot/
            plugin_dir = Path(os.path.dirname(os.path.abspath(__file__)))
            bot_path = plugin_dir / "bot"
        
        server_js = bot_path / "src" / "index.js"
        if not server_js.exists():
            logger.error(f"[LLMMC] Bot 入口文件不存在: {server_js}")
            logger.error(f"[LLMMC] 请在配置中设置正确的 bot_dir，或将 LLM_MC/bot 目录放在插件同级")
            return
        
        # 构造环境变量，传入 MC 配置
        env = os.environ.copy()
        env.update({
            "MC_HOST": str(self.mc_host),
            "MC_PORT": str(self.mc_port),
            "MC_USERNAME": str(self.mc_username),
            "MC_VERSION": str(self.mc_version),
            "BOT_SERVICE_PORT": str(self.bot_service_port),
            "AUTO_CONNECT": "true" if self.auto_connect else "false",
            "VIEWER_ENABLED": "true" if self.viewer_enabled else "false",
            "VIEWER_PORT": str(self.viewer_port),
        })
        
        try:
            self._bot_process = subprocess.Popen(
                ["node", str(server_js)],
                cwd=str(bot_path),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.STDOUT,
            )
            logger.info(f"[LLMMC] Bot 服务已启动 (PID: {self._bot_process.pid}) | MC: {self.mc_host}:{self.mc_port} | 端口: {self.bot_service_port}")
            
            # 等待服务就绪
            await asyncio.sleep(3)
            
        except FileNotFoundError:
            logger.error("[LLMMC] 未找到 node 命令，请确保 Node.js 已安装并在 PATH 中")
        except Exception as e:
            logger.error(f"[LLMMC] 启动 Bot 服务失败: {e}")
    
    async def _stop_bot_service(self):
        """停止 Bot 服务子进程"""
        if self._bot_process:
            try:
                self._bot_process.terminate()
                try:
                    self._bot_process.wait(timeout=5)
                except Exception:
                    self._bot_process.kill()
                logger.info(f"[LLMMC] Bot 服务已停止 (PID: {self._bot_process.pid})")
            except Exception as e:
                logger.warning(f"[LLMMC] 停止 Bot 服务时出错: {e}")
            self._bot_process = None
    
    def _migrate_bundled_skills(self, target_dir: str):
        """首次运行时，将插件自带的技能复制到数据目录"""
        import os
        import shutil
        from pathlib import Path
        
        target_path = Path(target_dir)
        if (target_path / "index.json").exists():
            return  # 已迁移过
        
        # 插件源目录下的 skills/
        plugin_dir = Path(os.path.dirname(os.path.abspath(__file__)))
        bundled_skills_dir = plugin_dir / "skills"
        
        if not bundled_skills_dir.exists():
            return
        
        target_path.mkdir(parents=True, exist_ok=True)
        count = 0
        for f in bundled_skills_dir.iterdir():
            if f.suffix in ('.py', '.json'):
                shutil.copy2(f, target_path / f.name)
                count += 1
        
        if count > 0:
            logger.info(f"[LLMMC] 已迁移 {count} 个内置技能到 {target_dir}")
    
    # ============================================================
    # 事件桥接
    # ============================================================
    
    async def _push_event(self, message: str, sender_name: str = None, wake_llm: bool = False):
        """推送 MC 事件到 AstrBot（平台无关）"""
        if not self.session_id:
            logger.warning("[LLMMC] 未配置 unified_group_umo，无法推送事件")
            return
        
        from astrbot.core.star.star_tools import StarTools
        
        sender = MessageMember(
            user_id=f"mc_{sender_name or 'bot'}",
            nickname=f"{sender_name or self.bot_nickname}(MC)"
        )
        abm = await StarTools.create_message(
            type="GroupMessage",
            self_id="astrbot_llmmc",
            session_id=self.session_id,
            sender=sender,
            message=[Plain(message)],
            message_str=message,
            group_id=self.group_id,
            raw_message={"_llmmc_wake_llm": wake_llm},
        )
        await StarTools.create_event(abm=abm, platform="aiocqhttp", is_wake=wake_llm)
    
    async def _on_bot_event(self, event: Dict[str, Any]):
        """处理来自 Bot WebSocket 的事件"""
        event_type = event.get("type")
        
        if event_type == "chat":
            username = event.get("username", "")
            message = event.get("message", "")
            # 忽略 bot 自己的消息
            if username and username.lower() != self.bot_nickname.lower():
                await self._push_event(message, sender_name=username, wake_llm=False)
        
        elif event_type == "death":
            await self._push_event(f"[MC事件] {self.bot_nickname}死亡了！", wake_llm=True)
        
        elif event_type == "spawn":
            await self._push_event(f"[MC事件] {self.bot_nickname}重生了", wake_llm=True)
        
        elif event_type == "health":
            pass  # Agent Loop 处理
        
        elif event_type == "kicked":
            reason = event.get("reason", "未知原因")
            await self._push_event(f"[MC事件] {self.bot_nickname}被踢出服务器: {reason}", wake_llm=False)
    
    async def _on_task_complete(self, task):
        """后台任务完成回调"""
        if task.status == TaskStatus.COMPLETED:
            msg = f"[MC任务完成] {task.name}: {task.progress}"
        elif task.status == TaskStatus.FAILED:
            msg = f"[MC任务失败] {task.name}: {task.error}"
        elif task.status == TaskStatus.CANCELLED:
            msg = f"[MC任务取消] {task.name}"
        else:
            return
        await self._push_event(msg, wake_llm=True)
    
    # ============================================================
    # 消息监听器 — 检测 LLMMC 标记并设置唤醒
    # ============================================================
    
    @filter.event_message_type(filter.EventMessageType.ALL)
    async def on_message(self, event: AstrMessageEvent):
        """检测 LLMMC 事件标记，设置强制唤醒 LLM"""
        raw = getattr(event.message_obj, 'raw_message', None)
        if isinstance(raw, dict) and raw.get('_llmmc_wake_llm'):
            event.is_at_or_wake_command = True
    
    # ============================================================
    # LLM 回复 → MC 聊天
    # ============================================================
    
    @filter.on_decorating_result()
    async def on_decorating_result(self, event: AstrMessageEvent):
        """拦截 LLM 回复，如果来源是 MC 玩家则发送到 MC 聊天"""
        if not self.enable_chat_response:
            return
        
        sender_id = event.get_sender_id()
        if not sender_id or not str(sender_id).startswith("mc_"):
            return
        
        result = event.get_result()
        if not result:
            return
        
        # 提取纯文本
        text_parts = []
        if hasattr(result, 'chain'):
            for comp in result.chain:
                if isinstance(comp, Plain):
                    text_parts.append(comp.text)
        
        if text_parts:
            mc_message = "".join(text_parts).strip()
            if mc_message and mc_message not in ["*No response*"]:
                # 分段发送（MC 聊天有长度限制）
                for i in range(0, len(mc_message), 200):
                    chunk = mc_message[i:i+200]
                    try:
                        await self.bot_client.execute_action("chat", {"message": chunk})
                    except Exception as e:
                        logger.error(f"[LLMMC] 发送 MC 消息失败: {e}")
        
        # 清空消息链，阻止发送到 QQ 群（MC 消息只回复到 MC）
        result.chain = []
    
    # ============================================================
    # Agent Loop（可选）
    # ============================================================
    
    async def _agent_loop(self):
        """简化版 Agent 循环：仅做环境感知和紧急推送"""
        import time
        ALERT_COOLDOWN = 30  # 同类告警冷却时间（秒）
        
        while True:
            try:
                await asyncio.sleep(self.agent_tick_rate)
                
                try:
                    obs = await self.bot_client.get_observation()
                except Exception:
                    continue  # Bot 可能还没连接
                
                now = time.time()
                health_data = obs.get("health", {})
                health = health_data.get("health", 20)
                food = health_data.get("food", 20)
                
                # 生命值警报
                if health < self.health_threshold and (now - self._last_health_alert) > ALERT_COOLDOWN:
                    msg = self._format_urgent_message("生命值危急", obs)
                    await self._push_event(msg, wake_llm=True)
                    self._last_health_alert = now
                
                # 饥饿值警报
                elif food < self.food_threshold and (now - self._last_food_alert) > ALERT_COOLDOWN:
                    msg = self._format_urgent_message("饥饿值过低", obs)
                    await self._push_event(msg, wake_llm=True)
                    self._last_food_alert = now
                    
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.error(f"[LLMMC] Agent tick error: {e}")
                await asyncio.sleep(10)
    
    def _format_urgent_message(self, reason: str, obs: Dict[str, Any]) -> str:
        """格式化紧急消息，包含环境快照"""
        health = obs.get("health", {})
        pos = obs.get("position", {})
        
        parts = [f"[MC紧急] {self.bot_nickname}{reason}!"]
        parts.append(f"生命:{health.get('health', '?')}/20 饥饿:{health.get('food', '?')}/20")
        parts.append(f"位置:({pos.get('x', '?'):.0f},{pos.get('y', '?'):.0f},{pos.get('z', '?'):.0f})")
        
        # 附近实体
        entities = obs.get("nearbyEntities", [])
        if entities:
            entity_strs = [f"{e.get('name','?')}({e.get('distance', '?'):.0f}格)" for e in entities[:5]]
            parts.append(f"附近: {', '.join(entity_strs)}")
        
        # 食物
        inventory = obs.get("inventory", [])
        foods = [item for item in inventory if item.get("isFood")]
        if foods:
            food_strs = [f"{f.get('name','?')}×{f.get('count', 1)}" for f in foods[:3]]
            parts.append(f"食物: {', '.join(food_strs)}")
        
        return " | ".join(parts)
    
    # ============================================================
    # LLM 工具注册
    # ============================================================
    
    # --- 基础动作 ---
    
    @filter.llm_tool(name="mc_chat")
    async def tool_chat(self, event: AstrMessageEvent, message: str):
        """在 Minecraft 聊天中发送消息
        
        Args:
            message(string): 要发送的消息内容
        """
        return await self.bot_client.execute_action("chat", {"message": message})
    
    @filter.llm_tool(name="mc_goto")
    async def tool_goto(self, event: AstrMessageEvent, x: int, y: int, z: int):
        """移动到指定坐标
        
        Args:
            x(number): X坐标
            y(number): Y坐标
            z(number): Z坐标
        """
        return await self.bot_client.execute_action("goTo", {"x": x, "y": y, "z": z})
    
    @filter.llm_tool(name="mc_follow_player")
    async def tool_follow_player(self, event: AstrMessageEvent, player_name: str):
        """跟随指定玩家（持续跟随，使用 mc_stop_moving 停止）
        
        Args:
            player_name(string): 要跟随的玩家名称
        """
        return await self.bot_client.execute_action("followPlayer", {"playerName": player_name})
    
    @filter.llm_tool(name="mc_stop_moving")
    async def tool_stop_moving(self, event: AstrMessageEvent):
        """停止移动"""
        return await self.bot_client.execute_action("stopMoving", {})
    
    @filter.llm_tool(name="mc_jump")
    async def tool_jump(self, event: AstrMessageEvent):
        """跳跃一次"""
        return await self.bot_client.execute_action("jump", {})
    
    @filter.llm_tool(name="mc_look_at")
    async def tool_look_at(self, event: AstrMessageEvent, x: int, y: int, z: int):
        """看向指定坐标
        
        Args:
            x(number): X坐标
            y(number): Y坐标
            z(number): Z坐标
        """
        return await self.bot_client.execute_action("lookAt", {"x": x, "y": y, "z": z})
    
    @filter.llm_tool(name="mc_attack")
    async def tool_attack(self, event: AstrMessageEvent, entity_type: str):
        """攻击最近的指定类型实体（单次攻击）
        
        Args:
            entity_type(string): 实体类型，如zombie、skeleton、creeper等
        """
        return await self.bot_client.execute_action("attack", {"entityType": entity_type})
    
    @filter.llm_tool(name="mc_collect_block")
    async def tool_collect_block(self, event: AstrMessageEvent, block_type: str):
        """挖掘并收集最近的指定类型方块
        
        Args:
            block_type(string): 方块类型，如oak_log、stone、diamond_ore等
        """
        return await self.bot_client.execute_action("collectBlock", {"blockType": block_type})
    
    @filter.llm_tool(name="mc_place_block")
    async def tool_place_block(self, event: AstrMessageEvent, block_name: str, x: int, y: int, z: int):
        """在指定位置放置方块
        
        Args:
            block_name(string): 方块名称
            x(number): X坐标
            y(number): Y坐标
            z(number): Z坐标
        """
        return await self.bot_client.execute_action("placeBlock", {"blockName": block_name, "x": x, "y": y, "z": z})
    
    @filter.llm_tool(name="mc_eat")
    async def tool_eat(self, event: AstrMessageEvent, food_name: str = ""):
        """吃东西恢复饥饿值。food_name 为空则自动选择
        
        Args:
            food_name(string): 食物名称，为空则自动选择背包中的食物
        """
        params = {}
        if food_name:
            params["foodName"] = food_name
        return await self.bot_client.execute_action("eat", params)
    
    @filter.llm_tool(name="mc_use_item")
    async def tool_use_item(self, event: AstrMessageEvent):
        """使用当前手持物品（弓箭、药水、末影珍珠等）"""
        return await self.bot_client.execute_action("useItem", {})
    
    @filter.llm_tool(name="mc_activate_block")
    async def tool_activate_block(self, event: AstrMessageEvent, x: int, y: int, z: int):
        """右键激活/交互方块（开门、按按钮、拉拉杆、使用床等）
        
        Args:
            x(number): X坐标
            y(number): Y坐标
            z(number): Z坐标
        """
        return await self.bot_client.execute_action("activateBlock", {"x": x, "y": y, "z": z})
    
    @filter.llm_tool(name="mc_wait")
    async def tool_wait(self, event: AstrMessageEvent, seconds: float):
        """等待指定时间（秒）
        
        Args:
            seconds(number): 等待的秒数
        """
        return await self.bot_client.execute_action("wait", {"seconds": seconds})
    
    # --- 物品栏 ---
    
    @filter.llm_tool(name="mc_view_inventory")
    async def tool_view_inventory(self, event: AstrMessageEvent):
        """查看背包物品"""
        return await self.bot_client.execute_action("viewInventory", {})
    
    @filter.llm_tool(name="mc_equip_item")
    async def tool_equip_item(self, event: AstrMessageEvent, item_name: str):
        """装备物品到手上
        
        Args:
            item_name(string): 物品名称
        """
        return await self.bot_client.execute_action("equipItem", {"itemName": item_name})
    
    @filter.llm_tool(name="mc_drop_item")
    async def tool_drop_item(self, event: AstrMessageEvent, item_name: str, count: int = -1):
        """丢弃物品。count 为 -1 表示全部丢弃
        
        Args:
            item_name(string): 物品名称
            count(number): 丢弃数量，-1表示全部丢弃
        """
        params = {"itemName": item_name}
        if count >= 0:
            params["count"] = count
        return await self.bot_client.execute_action("dropItem", params)
    
    # --- 合成 ---
    
    @filter.llm_tool(name="mc_craft")
    async def tool_craft(self, event: AstrMessageEvent, item_name: str, count: int = 1):
        """合成物品
        
        Args:
            item_name(string): 要合成的物品名称
            count(number): 合成数量，默认1
        """
        return await self.bot_client.execute_action("craft", {"itemName": item_name, "count": count})
    
    @filter.llm_tool(name="mc_list_recipes")
    async def tool_list_recipes(self, event: AstrMessageEvent, item_name: str):
        """查询物品的合成配方
        
        Args:
            item_name(string): 要查询配方的物品名称
        """
        return await self.bot_client.execute_action("listRecipes", {"itemName": item_name})
    
    @filter.llm_tool(name="mc_smelt")
    async def tool_smelt(self, event: AstrMessageEvent, item_name: str, fuel_name: str = "", count: int = 1):
        """冶炼物品。fuel_name 为空则自动选择燃料
        
        Args:
            item_name(string): 要冶炼的物品名称
            fuel_name(string): 燃料名称，为空则自动选择
            count(number): 冶炼数量，默认1
        """
        params = {"itemName": item_name, "count": count}
        if fuel_name:
            params["fuelName"] = fuel_name
        return await self.bot_client.execute_action("smelt", params)
    
    # --- 环境感知 ---
    
    @filter.llm_tool(name="mc_get_observation")
    async def tool_get_observation(self, event: AstrMessageEvent):
        """获取 Bot 的当前状态（位置、生命值、饥饿值、背包、附近实体等综合信息）"""
        return await self.bot_client.get_observation()
    
    @filter.llm_tool(name="mc_find_block")
    async def tool_find_block(self, event: AstrMessageEvent, block_type: str, max_distance: int = 32):
        """寻找最近的指定方块
        
        Args:
            block_type(string): 方块类型名称
            max_distance(number): 最大搜索距离，默认32
        """
        return await self.bot_client.execute_action("findBlock", {"blockType": block_type, "maxDistance": max_distance})
    
    @filter.llm_tool(name="mc_scan_entities")
    async def tool_scan_entities(self, event: AstrMessageEvent, range: int = 16, entity_type: str = ""):
        """扫描周围实体。entity_type 为空则扫描全部
        
        Args:
            range(number): 扫描范围，默认16
            entity_type(string): 实体类型过滤，为空则扫描全部
        """
        params = {"range": range}
        if entity_type:
            params["entityType"] = entity_type
        return await self.bot_client.execute_action("scanEntities", params)
    
    @filter.llm_tool(name="mc_list_players")
    async def tool_list_players(self, event: AstrMessageEvent):
        """获取服务器上所有在线玩家列表"""
        return await self.bot_client.execute_action("listPlayers", {})
    
    # --- 容器 ---
    
    @filter.llm_tool(name="mc_open_container")
    async def tool_open_container(self, event: AstrMessageEvent, x: int, y: int, z: int):
        """打开指定位置的容器（箱子、熔炉等）
        
        Args:
            x(number): X坐标
            y(number): Y坐标
            z(number): Z坐标
        """
        return await self.bot_client.execute_action("openContainer", {"x": x, "y": y, "z": z})
    
    @filter.llm_tool(name="mc_close_container")
    async def tool_close_container(self, event: AstrMessageEvent):
        """关闭当前打开的容器"""
        return await self.bot_client.execute_action("closeContainer", {})
    
    @filter.llm_tool(name="mc_deposit_item")
    async def tool_deposit_item(self, event: AstrMessageEvent, item_name: str, count: int = -1):
        """将物品放入容器。count 为 -1 表示全部
        
        Args:
            item_name(string): 物品名称
            count(number): 放入数量，-1表示全部
        """
        params = {"itemName": item_name}
        if count >= 0:
            params["count"] = count
        return await self.bot_client.execute_action("depositItem", params)
    
    @filter.llm_tool(name="mc_withdraw_item")
    async def tool_withdraw_item(self, event: AstrMessageEvent, item_name: str, count: int = -1):
        """从容器取出物品。count 为 -1 表示全部
        
        Args:
            item_name(string): 物品名称
            count(number): 取出数量，-1表示全部
        """
        params = {"itemName": item_name}
        if count >= 0:
            params["count"] = count
        return await self.bot_client.execute_action("withdrawItem", params)
    
    # --- 实体交互 ---
    
    @filter.llm_tool(name="mc_mount_entity")
    async def tool_mount_entity(self, event: AstrMessageEvent, entity_type: str = ""):
        """骑乘实体（马、船、矿车等）。entity_type 为空则骑乘最近的可骑乘实体
        
        Args:
            entity_type(string): 实体类型，为空则骑乘最近的可骑乘实体
        """
        params = {}
        if entity_type:
            params["entityType"] = entity_type
        return await self.bot_client.execute_action("mountEntity", params)
    
    @filter.llm_tool(name="mc_dismount")
    async def tool_dismount(self, event: AstrMessageEvent):
        """从当前骑乘的实体上下来"""
        return await self.bot_client.execute_action("dismount", {})
    
    @filter.llm_tool(name="mc_use_on_entity")
    async def tool_use_on_entity(self, event: AstrMessageEvent, entity_type: str, hand: str = "hand"):
        """对实体使用物品/右键交互（喂动物、与村民交易、拴绳等）
        
        Args:
            entity_type(string): 目标实体类型
            hand(string): 使用的手，hand或off-hand，默认hand
        """
        return await self.bot_client.execute_action("useOnEntity", {"entityType": entity_type, "hand": hand})
    
    # --- 高级功能 ---
    
    @filter.llm_tool(name="mc_execute_script")
    async def tool_execute_script(self, event: AstrMessageEvent, script: str, description: str = "", timeout: int = 300):
        """执行 Python 脚本来完成复杂任务。脚本必须定义 async main(bot) 函数。
        bot 对象提供所有 MC 操作方法（goTo、collectBlock、craft 等）。
        示例：
        async def main(bot):
            blocks = await bot.findBlock('diamond_ore')
            if blocks.get('found'):
                await bot.goTo(blocks['x'], blocks['y'], blocks['z'])
                await bot.collectBlock('diamond_ore')
            return "完成"
        
        Args:
            script(string): Python脚本代码，必须包含async main(bot)函数
            description(string): 脚本描述，用于日志记录
            timeout(number): 超时时间（秒），默认300
        """
        return await self.script_executor.execute(script, timeout=timeout)
    
    @filter.llm_tool(name="mc_start_skill")
    async def tool_start_skill(self, event: AstrMessageEvent, skill_name: str):
        """作为后台任务启动一个已保存的技能
        
        Args:
            skill_name(string): 技能名称
        """
        skill = self.skill_manager.get_skill(skill_name)
        if not skill:
            return {"success": False, "error": f"技能 '{skill_name}' 不存在"}
        
        async def run_skill():
            return await self.script_executor.execute(skill.get("full_code", ""))
        
        task = self.task_manager.create_task(
            name=f"技能:{skill_name}",
            description=skill.get("description", ""),
            coroutine_func=run_skill
        )
        return {"success": True, "task_id": task.id, "message": f"技能 '{skill_name}' 已作为后台任务启动"}
    
    @filter.llm_tool(name="mc_save_skill")
    async def tool_save_skill(self, event: AstrMessageEvent, name: str, description: str, code: str):
        """保存一个可复用的技能代码。code 是 Python 代码，会被包装成 async def skill_name(bot) 函数
        
        Args:
            name(string): 技能名称
            description(string): 技能描述
            code(string): Python代码
        """
        return self.skill_manager.save_skill(name, description, code)
    
    @filter.llm_tool(name="mc_list_skills")
    async def tool_list_skills(self, event: AstrMessageEvent):
        """查看所有已保存的技能"""
        skills = self.skill_manager.list_skills()
        if not skills:
            return {"skills": [], "message": "当前没有保存的技能"}
        return {"skills": skills}
    
    @filter.llm_tool(name="mc_delete_skill")
    async def tool_delete_skill(self, event: AstrMessageEvent, skill_name: str):
        """删除一个已保存的技能
        
        Args:
            skill_name(string): 要删除的技能名称
        """
        return self.skill_manager.delete_skill(skill_name)
    
    @filter.llm_tool(name="mc_get_task_status")
    async def tool_get_task_status(self, event: AstrMessageEvent, task_id: str = ""):
        """查看后台任务状态。task_id 为空则查看所有正在运行的任务
        
        Args:
            task_id(string): 任务ID，为空则查看全部
        """
        if task_id:
            task = self.task_manager.get_task(task_id)
            if not task:
                return {"error": f"任务 '{task_id}' 不存在"}
            return task.to_dict()
        return self.task_manager.get_status_summary()
    
    @filter.llm_tool(name="mc_cancel_task")
    async def tool_cancel_task(self, event: AstrMessageEvent, task_id: str):
        """取消一个后台任务
        
        Args:
            task_id(string): 要取消的任务ID
        """
        success = await self.task_manager.cancel_task(task_id)
        if success:
            return {"success": True, "message": f"任务 '{task_id}' 已取消"}
        return {"success": False, "error": f"无法取消任务 '{task_id}'（可能不存在或已完成）"}
    
    # --- Bot 连接管理 ---
    
    @filter.llm_tool(name="mc_bot_status")
    async def tool_bot_status(self, event: AstrMessageEvent):
        """查看 MC Bot 的连接状态"""
        try:
            return await self.bot_client.get_status()
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    @filter.llm_tool(name="mc_connect")
    async def tool_connect(self, event: AstrMessageEvent):
        """连接 MC Bot 到 Minecraft 服务器"""
        return await self.bot_client.connect_mc()
    
    @filter.llm_tool(name="mc_disconnect")
    async def tool_disconnect(self, event: AstrMessageEvent):
        """断开 MC Bot 与 Minecraft 服务器的连接"""
        return await self.bot_client.disconnect_mc()
    
    # ============================================================
    # 管理命令
    # ============================================================
    
    @filter.command("mc_status")
    async def cmd_status(self, event: AstrMessageEvent):
        """查看 LLMMC 插件状态"""
        try:
            bot_status = await self.bot_client.get_status()
            connected = bot_status.get("connected", False)
        except Exception:
            connected = False
        
        task_summary = self.task_manager.get_status_summary() if self.task_manager else {}
        skills_count = len(self.skill_manager.list_skills()) if self.skill_manager else 0
        
        lines = [
            f"🤖 LLMMC 插件状态",
            f"Bot 连接: {'✅ 已连接' if connected else '❌ 未连接'}",
            f"Bot 服务: {self.bot_http_url}",
            f"绑定群: {self.session_id or '未配置'}",
            f"Agent Loop: {'✅ 启用' if self.enable_agent_loop else '❌ 关闭'}",
            f"技能数: {skills_count}",
            f"任务: {task_summary.get('summary', '无')}",
        ]
        yield event.plain_result("\n".join(lines))
