"""
Task Manager - 管理后台技能/脚本的异步执行
移植自 LLM_MC backend/app/task/manager.py
"""
import asyncio
import time
import traceback
from typing import Dict, Any, Optional, Callable, List
from enum import Enum
from dataclasses import dataclass, field
import uuid


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Task:
    id: str
    name: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    progress: str = ""
    result: Any = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    logs: List[str] = field(default_factory=list)
    _async_task: Optional[asyncio.Task] = field(default=None, repr=False)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "progress": self.progress,
            "result": self.result if not callable(self.result) else str(self.result),
            "error": self.error,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration": self._get_duration(),
            "logs": self.logs[-10:],
        }
    
    def _get_duration(self) -> Optional[float]:
        if self.started_at is None:
            return None
        end_time = self.completed_at or time.time()
        return round(end_time - self.started_at, 2)


class TaskManager:
    def __init__(self, max_concurrent_tasks: int = 3):
        self.max_concurrent_tasks = max_concurrent_tasks
        self._tasks: Dict[str, Task] = {}
        self._task_history: List[Task] = []
        self._max_history = 20
        self._on_complete_callback: Optional[Callable] = None
    
    def set_on_complete_callback(self, callback: Callable):
        """设置任务完成回调（用于通知 Agent Loop）"""
        self._on_complete_callback = callback
    
    @property
    def current_task(self) -> Optional[Task]:
        running_tasks = [t for t in self._tasks.values() if t.status == TaskStatus.RUNNING]
        if running_tasks:
            return max(running_tasks, key=lambda t: t.created_at)
        return None
    
    @property
    def running_tasks(self) -> List[Task]:
        return [t for t in self._tasks.values() if t.status == TaskStatus.RUNNING]
    
    def create_task(self, name: str, description: str, coroutine_func: Callable, *args, **kwargs) -> Task:
        task_id = str(uuid.uuid4())[:8]
        task = Task(id=task_id, name=name, description=description)
        self._tasks[task_id] = task
        
        async def wrapped_coroutine():
            try:
                task.status = TaskStatus.RUNNING
                task.started_at = time.time()
                task.progress = "开始执行..."
                result = await coroutine_func(*args, **kwargs)
                task.status = TaskStatus.COMPLETED
                task.result = result
                task.progress = "执行完成"
                task.completed_at = time.time()
            except asyncio.CancelledError:
                task.status = TaskStatus.CANCELLED
                task.progress = "已取消"
                task.completed_at = time.time()
                raise
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.error = str(e)
                task.progress = f"执行失败: {str(e)[:50]}"
                task.completed_at = time.time()
                task.logs.append(f"错误详情: {traceback.format_exc()}")
            finally:
                self._move_to_history(task_id)
                if self._on_complete_callback:
                    try:
                        await self._on_complete_callback(task)
                    except Exception:
                        pass
        
        task._async_task = asyncio.create_task(wrapped_coroutine())
        return task
    
    def _move_to_history(self, task_id: str):
        if task_id in self._tasks:
            task = self._tasks.pop(task_id)
            self._task_history.append(task)
            if len(self._task_history) > self._max_history:
                self._task_history = self._task_history[-self._max_history:]
    
    def get_task(self, task_id: str) -> Optional[Task]:
        if task_id in self._tasks:
            return self._tasks[task_id]
        for task in self._task_history:
            if task.id == task_id:
                return task
        return None
    
    def update_progress(self, task_id: str, progress: str):
        if task_id in self._tasks:
            self._tasks[task_id].progress = progress
            self._tasks[task_id].logs.append(progress)
    
    async def cancel_task(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        task = self._tasks[task_id]
        if task.status != TaskStatus.RUNNING:
            return False
        if task._async_task:
            task._async_task.cancel()
            try:
                await task._async_task
            except asyncio.CancelledError:
                pass
        return True
    
    async def cancel_all_tasks(self):
        for task_id in list(self._tasks.keys()):
            await self.cancel_task(task_id)
    
    def get_status_summary(self) -> Dict[str, Any]:
        running = self.running_tasks
        if not running:
            return {"has_active_tasks": False, "summary": "当前没有正在执行的任务"}
        summaries = []
        for task in running:
            duration = task._get_duration()
            summaries.append(f"[运行中] {task.name}: {task.progress} (已执行 {duration}秒)")
        return {
            "has_active_tasks": True,
            "running_count": len(running),
            "summary": "\n".join(summaries),
            "tasks": [t.to_dict() for t in running],
        }
    
    def get_recent_history(self, limit: int = 5) -> List[Dict[str, Any]]:
        recent = self._task_history[-limit:]
        return [t.to_dict() for t in reversed(recent)]
