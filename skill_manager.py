"""
Skill Manager - 管理可复用的技能代码
移植自 LLM_MC backend/app/skills/manager.py
"""
import os
import json
import re
from typing import Dict, List, Optional
from pathlib import Path


class SkillManager:
    def __init__(self, skills_dir: str | Path):
        self.skills_dir = Path(skills_dir)
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.skills_dir / "index.json"
        self._index: Dict[str, dict] = {}
        self._load_index()
    
    def _load_index(self):
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self._index = json.load(f)
            except Exception:
                self._index = {}
    
    def _save_index(self):
        try:
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self._index, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
    
    def _skill_file(self, name: str) -> Path:
        safe_name = re.sub(r'[^\w\-]', '_', name)
        return self.skills_dir / f"{safe_name}.py"
    
    def _safe_func_name(self, name: str) -> str:
        safe = re.sub(r'[^\w]', '_', name)
        if safe and safe[0].isdigit():
            safe = '_' + safe
        return safe or 'unnamed_skill'
    
    def save_skill(self, name: str, description: str, code: str, params: List[str] = None) -> dict:
        params = params or []
        if not name or not name.strip():
            return {"success": False, "error": "技能名不能为空"}
        name = name.strip()
        
        param_str = ", ".join(params) if params else ""
        full_code = self._wrap_skill_code(name, description, code, param_str)
        
        skill_file = self._skill_file(name)
        try:
            with open(skill_file, 'w', encoding='utf-8') as f:
                f.write(full_code)
        except Exception as e:
            return {"success": False, "error": f"保存代码失败: {e}"}
        
        self._index[name] = {
            "name": name,
            "description": description,
            "params": params,
            "file": skill_file.name
        }
        self._save_index()
        return {"success": True, "message": f"技能 '{name}' 已保存"}
    
    def _wrap_skill_code(self, name, description, code, param_str):
        lines = code.split('\n')
        indented_lines = ['    ' + line if line.strip() else line for line in lines]
        indented_code = '\n'.join(indented_lines)
        func_name = self._safe_func_name(name)
        
        return f'"""\n技能: {name}\n描述: {description}\n"""\n\nasync def {func_name}(bot{", " + param_str if param_str else ""}):\n    """{description}"""\n{indented_code}\n'
    
    def get_skill(self, name: str) -> Optional[dict]:
        if name not in self._index:
            return None
        skill_info = self._index[name].copy()
        skill_file = self._skill_file(name)
        if skill_file.exists():
            try:
                with open(skill_file, 'r', encoding='utf-8') as f:
                    skill_info['full_code'] = f.read()
            except Exception as e:
                skill_info['full_code'] = f"# 读取失败: {e}"
        return skill_info
    
    def list_skills(self) -> List[dict]:
        return list(self._index.values())
    
    def delete_skill(self, name: str) -> dict:
        if name not in self._index:
            return {"success": False, "error": f"技能 '{name}' 不存在"}
        skill_file = self._skill_file(name)
        try:
            if skill_file.exists():
                skill_file.unlink()
        except Exception as e:
            return {"success": False, "error": f"删除文件失败: {e}"}
        del self._index[name]
        self._save_index()
        return {"success": True, "message": f"技能 '{name}' 已删除"}
    
    def get_skills_description(self) -> str:
        if not self._index:
            return "当前没有保存的技能。"
        lines = ["已保存的技能:"]
        for name, skill in self._index.items():
            params = skill.get('params', [])
            param_str = f"({', '.join(params)})" if params else "()"
            lines.append(f"  - {name}{param_str}: {skill.get('description', '无描述')}")
        return '\n'.join(lines)
