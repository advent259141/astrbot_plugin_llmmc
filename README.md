# astrbot_plugin_llmmc

将 [LLM-MC](https://github.com/example/LLM_MC) 的 Minecraft Bot 控制能力集成到 AstrBot，实现 **MC 聊天与 QQ 群上下文互通**，LLM 通过工具调用直接控制 Minecraft Bot。

## ✨ 功能

- 🔗 **MC ↔ QQ 双向消息桥接** — MC 聊天自动转发到绑定的 QQ 群，QQ 群回复自动发送到 MC
- 🧠 **统一上下文** — MC 和 QQ 群共享同一个 LLM 对话历史，对话无缝衔接
- 🛠️ **30+ LLM 工具** — 移动、挖矿、合成、战斗、查看背包等，LLM 可直接控制 Bot
- 📜 **脚本执行** — LLM 可编写并执行 Python 脚本完成复杂任务
- 💾 **技能管理** — 保存/复用常用操作为技能，支持后台运行（内置 7 个预制技能）
- 🚨 **Agent Loop** — 可选的自主感知循环，生命值/饥饿值过低时主动唤醒 LLM 决策
- 🚀 **一键启动** — 插件自动拉起 Node.js Bot 服务，无需手动启动

## 📐 架构

```
astrbot_plugin_llmmc/          ← 整个插件自包含
├── bot/                       ← Node.js Mineflayer Bot 服务
│   ├── src/server.js
│   ├── package.json
│   └── ...
├── skills/                    ← 内置技能（挖矿、打怪、合成等）
├── main.py                    ← 插件入口
├── bot_client.py              ← HTTP/WS 客户端
├── script_executor.py         ← BotAPI + 沙盒脚本执行
├── skill_manager.py           ← 技能持久化
├── task_manager.py            ← 后台任务管理
├── metadata.yaml
└── _conf_schema.json
```

```
插件启动 → 自动拉起 node bot/src/server.js → 连接 MC 服务器
           ↕ HTTP/WS
       AstrBot LLM ←→ QQ 群 / MC 聊天（共享上下文）
```

## 🚀 快速开始

### 前置要求

- AstrBot 已安装并运行
- Node.js 已安装（用于 Mineflayer Bot）
- Python 依赖：`httpx`, `websockets`

### 安装

1. 将 `astrbot_plugin_llmmc/` 目录放入 AstrBot 的插件目录
2. 安装 Python 依赖：
   ```bash
   pip install httpx websockets
   ```
3. 安装 Bot 依赖（仅首次）：
   ```bash
   cd astrbot_plugin_llmmc/bot && npm install
   ```
4. 在 AstrBot WebUI 中启用插件并配置

> **完成！** 插件启动时会自动拉起 Bot 服务，无需手动启动 Node.js。

### 配置

#### Bot 服务 & MC 服务器

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `auto_start_bot` | 自动启动 Bot 服务 | `true` |
| `bot_dir` | Bot 目录（留空用插件内置的） | `""` |
| `mc_host` | MC 服务器地址 | `localhost` |
| `mc_port` | MC 服务器端口 | `25565` |
| `mc_username` | Bot 用户名 | `LLM_Bot` |
| `mc_version` | MC 版本 | `1.20.1` |
| `bot_service_port` | Bot HTTP/WS 端口 | `3001` |
| `auto_connect` | 启动后自动连接 MC | `false` |
| `viewer_enabled` | 启用 prismarine-viewer | `false` |
| `viewer_port` | Viewer 端口 | `3007` |

#### AstrBot 集成

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `unified_group_umo` | 绑定 QQ 群 UMO | `""` |
| `bot_nickname` | MC 中的机器人名称 | `小面包` |
| `enable_chat_response` | LLM 回复发到 MC 聊天 | `true` |
| `enable_agent_loop` | 启用自主环境感知循环 | `false` |
| `agent_tick_rate` | Agent 循环间隔（秒） | `5` |
| `health_threshold` | 生命值警报阈值 | `6` |
| `food_threshold` | 饥饿值警报阈值 | `4` |

**UMO 格式：** `aiocqhttp_default:GroupMessage:123456789`

## 🛠️ LLM 工具列表

<details>
<summary>基础动作（13个）</summary>

`mc_chat` · `mc_goto` · `mc_follow_player` · `mc_stop_moving` · `mc_jump` · `mc_look_at` · `mc_attack` · `mc_collect_block` · `mc_place_block` · `mc_eat` · `mc_use_item` · `mc_activate_block` · `mc_wait`
</details>

<details>
<summary>物品栏与合成（6个）</summary>

`mc_view_inventory` · `mc_equip_item` · `mc_drop_item` · `mc_craft` · `mc_list_recipes` · `mc_smelt`
</details>

<details>
<summary>环境感知（4个）</summary>

`mc_get_observation` · `mc_find_block` · `mc_scan_entities` · `mc_list_players`
</details>

<details>
<summary>容器与实体交互（7个）</summary>

`mc_open_container` · `mc_close_container` · `mc_deposit_item` · `mc_withdraw_item` · `mc_mount_entity` · `mc_dismount` · `mc_use_on_entity`
</details>

<details>
<summary>高级功能（10个）</summary>

`mc_execute_script` · `mc_start_skill` · `mc_save_skill` · `mc_list_skills` · `mc_delete_skill` · `mc_get_task_status` · `mc_cancel_task` · `mc_bot_status` · `mc_connect` · `mc_disconnect`
</details>

## 📦 内置技能

| 技能 | 说明 |
|------|------|
| ⛏️ 挖矿 | 自动寻矿并挖掘 |
| 🔨 合成 | 智能合成物品 |
| ⚔️ 打怪 | 战斗逻辑 |
| 🎣 钓鱼 | 自动钓鱼 |
| 🪵 采集木头 | 伐木收集 |
| 🎁 丢给玩家 | 将物品丢给指定玩家 |
| 📦 拾取物品 | 自动拾取附近物品 |

## 📝 管理命令

| 命令 | 说明 |
|------|------|
| `/mc_status` | 查看插件状态、Bot 连接、任务信息 |

## 🔧 工作原理

### 消息流向

```
MC 玩家聊天 ──WS──→ 插件 ──create_event──→ AstrBot LLM ──回复──→ 插件 ──HTTP──→ MC 聊天
QQ 群消息 ──────────────────────────────→ AstrBot LLM ──工具调用──→ 插件 ──HTTP──→ MC Bot
```

### LLM 唤醒机制

- **MC 普通聊天**：`create_event(is_wake=False)`，由 AstrBot 唤醒词规则决定
- **紧急事件**（Agent Loop）：通过 `raw_message._llmmc_wake_llm` 标记 + `EventMessageType.ALL` handler 设置 `event.is_at_or_wake_command = True`，强制触发 LLM

### 环境上下文

- 不自动注入 system prompt（保护 API 缓存）
- LLM 按需调用 `mc_get_observation` 获取环境信息
- Agent Loop 仅在紧急情况时主动推送环境快照
