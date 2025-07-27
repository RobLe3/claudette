#!/usr/bin/env python3
"""
CLAUDETTE COMMAND LAYER - Boss Nass Style Military Command!

Mesa design dis like da Gungan Grand Army - smart commanders who know:
- Which soldiers are best for which battles
- When to send reinforcements vs single scouts
- How to adapt tactics based on enemy resistance
- Quality management of our AI warrior force!
"""

import time
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import json
from pathlib import Path

# Import our BOMBAD XP system!
from .soldier_xp_system import (
    GLOBAL_XP_SYSTEM, SkillCategory, MissionDifficulty, 
    SoldierXPProfile, XPCommanderSystem
)

# Import our BOMBAD MENTORSHIP AND PROTECTION SYSTEM!
from .mentorship_system import (
    GLOBAL_PROTECTION_SYSTEM, MentorshipStatus, SafetyLevel,
    RookieProtectionSystem
)

class SoldierQuality(Enum):
    """Different quality levels of our AI soldiers"""
    ELITE = "elite"          # Claude Sonnet, GPT-4 - for critical missions
    VETERAN = "veteran"      # Claude Haiku, GPT-3.5 - for complex tasks  
    REGULAR = "regular"      # Qwen, Llama - for standard operations
    RECRUIT = "recruit"      # Local models - for simple tasks
    SPECIALIST = "specialist" # Fine-tuned models - for specific domains

class MissionComplexity(Enum):
    """How complex is da mission?"""
    TRIVIAL = 1      # Simple questions, basic tasks
    SIMPLE = 2       # Straightforward coding, basic analysis
    MODERATE = 3     # Multi-step problems, medium complexity
    COMPLEX = 4      # Advanced algorithms, system design
    CRITICAL = 5     # Mission-critical, high-stakes operations

class BattleTactic(Enum):
    """Different ways to deploy our forces"""
    SOLO_SCOUT = "solo"           # Single soldier for quick recon
    SEQUENTIAL_SQUAD = "sequential" # One after another, careful approach
    PARALLEL_FORCE = "parallel"    # Multiple soldiers simultaneously
    ADAPTIVE_WAVE = "adaptive"     # Start small, reinforce as needed
    OVERWHELMING_POWER = "overwhelming" # All available forces (rarely used)

@dataclass
class Soldier:
    """Individual AI soldier in our army"""
    name: str
    backend_type: str  # 'qwen', 'claude', 'gpt', 'local'
    quality: SoldierQuality
    api_endpoint: str
    api_key: Optional[str] = None
    max_tokens: int = 1000
    temperature: float = 0.7
    timeout: int = 30
    
    # Performance tracking - mesa track how good each soldier is!
    missions_completed: int = 0
    missions_failed: int = 0
    average_response_time: float = 0.0
    total_tokens_used: int = 0
    specialties: List[str] = field(default_factory=list)
    
    @property
    def success_rate(self) -> float:
        """How often dis soldier succeeds"""
        total = self.missions_completed + self.missions_failed
        return self.missions_completed / total if total > 0 else 0.0
    
    @property
    def efficiency_score(self) -> float:
        """Quality per time - higher is better"""
        if self.average_response_time > 0:
            return self.success_rate / self.average_response_time
        return 0.0

@dataclass
class Mission:
    """A mission for our soldiers to complete"""
    task_description: str
    complexity: MissionComplexity
    required_specialties: List[str] = field(default_factory=list)
    max_soldiers: int = 3
    timeout: int = 60
    retry_attempts: int = 2
    quality_threshold: float = 0.5  # Minimum success rate required (50% is reasonable)

class CommanderBossNass:
    """
    DA BOSS COMMANDER! Like Boss Nass but for AI soldiers!
    Mesa make smart decisions about which soldiers to send where!
    """
    
    def __init__(self):
        self.soldiers: Dict[str, Soldier] = {}
        self.mission_history: List[Dict] = []
        self.logger = self._setup_logging()
        self.xp_system = GLOBAL_XP_SYSTEM  # Connect to our XP system!
        self.protection_system = GLOBAL_PROTECTION_SYSTEM  # Connect to our protection system!
        
        # Initialize our army with different soldier types
        self._recruit_initial_army()
    
    def _setup_logging(self):
        """Setup command logging like proper military"""
        logging.basicConfig(
            level=logging.INFO,
            format='🎖️ COMMAND: %(asctime)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(__name__)
    
    def _recruit_initial_army(self):
        """Recruit our initial army of AI soldiers"""
        # Mesa's proven Qwen soldier
        self.register_soldier(Soldier(
            name="Qwen_Warrior_001",
            backend_type="qwen", 
            quality=SoldierQuality.REGULAR,
            api_endpoint="https://tools.flexcon-ai.de/v1",
            api_key="k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1",
            max_tokens=800,
            temperature=0.7,
            timeout=25,
            specialties=["coding", "python", "algorithms"]
        ))
        
        # Placeholder for other soldiers (can be added later)
        self.register_soldier(Soldier(
            name="Local_Scout_001",
            backend_type="local",
            quality=SoldierQuality.RECRUIT,
            api_endpoint="http://localhost:8080",
            max_tokens=500,
            timeout=15,
            specialties=["simple_tasks", "quick_responses"]
        ))
    
    def register_soldier(self, soldier: Soldier):
        """Add a new soldier to our army"""
        self.soldiers[soldier.name] = soldier
        # Register in XP system too!
        self.xp_system.register_soldier(soldier.name)
        self.logger.info(f"New soldier recruited: {soldier.name} ({soldier.quality.value})")
    
    def assess_mission_complexity(self, task: str) -> MissionComplexity:
        """Mesa analyze how complex dis mission is"""
        task_lower = task.lower()
        
        # Keywords that indicate different complexity levels
        critical_keywords = ["critical", "production", "security", "architecture", "system design"]
        complex_keywords = ["algorithm", "optimization", "database", "api design", "multi-step"]
        moderate_keywords = ["function", "class", "debug", "refactor", "test"]
        simple_keywords = ["hello", "add", "print", "basic", "simple"]
        
        if any(word in task_lower for word in critical_keywords):
            return MissionComplexity.CRITICAL
        elif any(word in task_lower for word in complex_keywords):
            return MissionComplexity.COMPLEX
        elif any(word in task_lower for word in moderate_keywords):
            return MissionComplexity.MODERATE
        elif any(word in task_lower for word in simple_keywords):
            return MissionComplexity.SIMPLE
        else:
            return MissionComplexity.TRIVIAL
    
    def select_best_soldiers(self, mission: Mission) -> List[Soldier]:
        """
        Mesa choose da best soldiers with BOMBAD ROOKIE PROTECTION!
        Like Boss Nass protecting young Gungans while building strong army!
        """
        # Use SAFE ASSIGNMENT SYSTEM that protects rookies!
        assignment = self.protection_system.safe_mission_assignment(mission.task_description)
        
        self.logger.info(f"🛡️ SAFE ASSIGNMENT SYSTEM ENGAGED")
        self.logger.info(f"  Mission: {assignment['difficulty']} {assignment['required_skill']}")
        self.logger.info(f"  Decision: {assignment['assignment_reasoning']}")
        
        if assignment['soldiers_assigned']:
            selected_soldiers = []
            
            for soldier_name in assignment['soldiers_assigned']:
                if soldier_name in self.soldiers:
                    selected_soldiers.append(self.soldiers[soldier_name])
                    
                    # Log soldier status for transparency
                    status = self.protection_system.get_mentorship_status(soldier_name)
                    wellbeing = self.protection_system.get_wellbeing(soldier_name)
                    
                    self.logger.info(f"  👤 {soldier_name}: {status.value.upper()}")
                    self.logger.info(f"     Morale: {wellbeing.morale:.1%}, Effectiveness: {wellbeing.combat_effectiveness:.1%}")
                    
                    if wellbeing.is_wounded:
                        self.logger.info(f"     ⚠️ WOUNDED: {len(wellbeing.wounds)} injuries, recovery needed")
            
            if assignment['mentorship_used']:
                self.logger.info(f"  🎓 MENTORSHIP ACTIVATED: Experienced soldier guides rookie")
            
            if assignment['safety_measures']:
                self.logger.info(f"  🛡️ SAFETY MEASURES:")
                for measure in assignment['safety_measures']:
                    self.logger.info(f"     - {measure}")
            
            return selected_soldiers
        
        else:
            # Mission was rejected for safety reasons
            self.logger.info(f"  ❌ MISSION REJECTED FOR ARMY SAFETY")
            return []
    
    def choose_battle_tactic(self, mission: Mission, soldiers: List[Soldier]) -> BattleTactic:
        """Mesa choose da best tactic based on mission and soldiers"""
        
        if len(soldiers) == 1:
            return BattleTactic.SOLO_SCOUT
        
        if mission.complexity in [MissionComplexity.CRITICAL, MissionComplexity.COMPLEX]:
            # For important missions, start careful
            return BattleTactic.SEQUENTIAL_SQUAD
        elif mission.complexity == MissionComplexity.MODERATE:
            # Medium missions can try parallel if soldiers are reliable
            avg_success = sum(s.success_rate for s in soldiers) / len(soldiers)
            if avg_success > 0.8:
                return BattleTactic.PARALLEL_FORCE
            else:
                return BattleTactic.SEQUENTIAL_SQUAD
        else:
            # Simple missions can be parallel
            return BattleTactic.PARALLEL_FORCE
    
    async def execute_mission(self, task: str, **kwargs) -> Dict[str, Any]:
        """
        MAIN COMMAND FUNCTION! Mesa coordinate da whole mission!
        """
        self.logger.info(f"🎯 NEW MISSION RECEIVED: {task[:100]}...")
        
        # Create mission object
        complexity = self.assess_mission_complexity(task)
        mission = Mission(
            task_description=task,
            complexity=complexity,
            required_specialties=kwargs.get('specialties', []),
            max_soldiers=kwargs.get('max_soldiers', 3),
            timeout=kwargs.get('timeout', 60)
        )
        
        self.logger.info(f"📊 Mission complexity assessed: {complexity.name}")
        
        # Select best soldiers
        selected_soldiers = self.select_best_soldiers(mission)
        
        if not selected_soldiers:
            return {
                "success": False,
                "error": "No suitable soldiers available for this mission",
                "mission_complexity": complexity.name
            }
        
        # Choose tactic
        tactic = self.choose_battle_tactic(mission, selected_soldiers)
        self.logger.info(f"⚔️ Battle tactic chosen: {tactic.name}")
        
        # Execute mission with chosen tactic
        mission_start = time.time()
        
        if tactic == BattleTactic.SOLO_SCOUT:
            result = await self._execute_solo_mission(selected_soldiers[0], task)
        elif tactic == BattleTactic.SEQUENTIAL_SQUAD:
            result = await self._execute_sequential_mission(selected_soldiers, task)
        elif tactic == BattleTactic.PARALLEL_FORCE:
            result = await self._execute_parallel_mission(selected_soldiers, task)
        else:
            result = await self._execute_adaptive_mission(selected_soldiers, task)
        
        mission_time = time.time() - mission_start
        
        # Update soldier performance stats AND XP!
        self._update_soldier_stats(selected_soldiers, result, mission_time)
        
        # Award XP to soldiers who participated!
        soldier_names = [s.name for s in selected_soldiers]
        
        for soldier in selected_soldiers:
            xp_result = self.xp_system.complete_mission(
                soldier.name, task, 
                result.get("success", False), mission_time
            )
            
            if xp_result["xp_awarded"] > 0:
                self.logger.info(f"🎉 {soldier.name} gained {xp_result['xp_awarded']} XP!")
                if xp_result["new_level"] > 1:
                    self.logger.info(f"   Now Level {xp_result['new_level']} ({xp_result['new_rank']})")
                if xp_result["badges_earned"]:
                    self.logger.info(f"   🏆 New badges: {', '.join(xp_result['badges_earned'])}")
        
        # Record mission outcome for soldier wellbeing and mentorship!
        mission_success = result.get("success", False)
        injuries = [] if mission_success else soldier_names  # Failed missions can cause injuries
        
        self.protection_system.record_mission_outcome(
            soldier_names, mission_success, mission_time, injuries
        )
        
        # Log wellbeing changes
        for soldier_name in soldier_names:
            wellbeing = self.protection_system.get_wellbeing(soldier_name)
            status = self.protection_system.get_mentorship_status(soldier_name)
            
            if not mission_success and soldier_name in injuries:
                self.logger.info(f"💔 {soldier_name} suffered mission failure stress (Morale: {wellbeing.morale:.1%})")
                if wellbeing.consecutive_failures >= 3:
                    self.logger.info(f"   ⚠️ {soldier_name} needs support after {wellbeing.consecutive_failures} failures")
            elif mission_success:
                self.logger.info(f"😊 {soldier_name} morale boosted to {wellbeing.morale:.1%}")
                
                # Check for status changes
                new_status = self.protection_system.get_mentorship_status(soldier_name)
                if new_status != status:
                    self.logger.info(f"   📈 {soldier_name} promoted: {status.value} → {new_status.value}")
        
        # Record mission in history
        mission_record = {
            "timestamp": time.time(),
            "task": task[:200],
            "complexity": complexity.name,
            "tactic": tactic.name,
            "soldiers_used": [s.name for s in selected_soldiers],
            "success": result.get("success", False),
            "mission_time": mission_time,
            "result": result
        }
        self.mission_history.append(mission_record)
        
        self.logger.info(f"🎖️ Mission completed in {mission_time:.2f}s - Success: {result.get('success', False)}")
        
        return result
    
    async def _execute_solo_mission(self, soldier: Soldier, task: str) -> Dict[str, Any]:
        """Single soldier mission - quick and efficient"""
        from claudette.qwen_backend import QwenBackend
        import requests
        
        try:
            if soldier.backend_type == "qwen":
                return await self._call_qwen_soldier(soldier, task)
            else:
                # Placeholder for other backend types
                return {"success": False, "error": f"Backend {soldier.backend_type} not implemented yet"}
        except Exception as e:
            return {"success": False, "error": str(e), "soldier": soldier.name}
    
    async def _call_qwen_soldier(self, soldier: Soldier, task: str) -> Dict[str, Any]:
        """Call our proven Qwen warrior"""
        import requests
        
        url = f"{soldier.api_endpoint}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {soldier.api_key}"
        }
        
        data = {
            "model": "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ",
            "messages": [{"role": "user", "content": task}],
            "max_tokens": soldier.max_tokens,
            "temperature": soldier.temperature
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=soldier.timeout)
            
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    return {
                        "success": True,
                        "result": content,
                        "soldier": soldier.name,
                        "tokens_used": len(content.split())
                    }
            
            return {"success": False, "error": f"API error: {response.status_code}", "soldier": soldier.name}
            
        except Exception as e:
            return {"success": False, "error": str(e), "soldier": soldier.name}
    
    async def _execute_sequential_mission(self, soldiers: List[Soldier], task: str) -> Dict[str, Any]:
        """Sequential deployment - one soldier at a time"""
        for soldier in soldiers:
            result = await self._execute_solo_mission(soldier, task)
            if result.get("success", False):
                return result
            # Brief delay before next soldier
            await asyncio.sleep(1)
        
        return {"success": False, "error": "All soldiers failed in sequential mission"}
    
    async def _execute_parallel_mission(self, soldiers: List[Soldier], task: str) -> Dict[str, Any]:
        """Parallel deployment - all soldiers at once (carefully!)"""
        tasks = [self._execute_solo_mission(soldier, task) for soldier in soldiers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Return first successful result
        for result in results:
            if isinstance(result, dict) and result.get("success", False):
                return result
        
        return {"success": False, "error": "All parallel soldiers failed", "results": results}
    
    async def _execute_adaptive_mission(self, soldiers: List[Soldier], task: str) -> Dict[str, Any]:
        """Adaptive deployment - start with one, add reinforcements if needed"""
        # Start with best soldier
        result = await self._execute_solo_mission(soldiers[0], task)
        if result.get("success", False):
            return result
        
        # If failed, try with remaining soldiers in parallel
        if len(soldiers) > 1:
            return await self._execute_parallel_mission(soldiers[1:], task)
        
        return result
    
    def _update_soldier_stats(self, soldiers: List[Soldier], result: Dict, mission_time: float):
        """Update performance stats for soldiers who participated"""
        success = result.get("success", False)
        
        for soldier in soldiers:
            if success:
                soldier.missions_completed += 1
            else:
                soldier.missions_failed += 1
            
            # Update average response time
            total_missions = soldier.missions_completed + soldier.missions_failed
            soldier.average_response_time = (
                (soldier.average_response_time * (total_missions - 1) + mission_time) / total_missions
            )
            
            # Update token usage if available
            if "tokens_used" in result:
                soldier.total_tokens_used += result["tokens_used"]
    
    def get_army_status(self) -> Dict[str, Any]:
        """Get status report of our entire army with BOMBAD XP INFO!"""
        basic_status = {
            "total_soldiers": len(self.soldiers),
            "soldiers": {
                name: {
                    "quality": soldier.quality.value,
                    "success_rate": soldier.success_rate,
                    "efficiency_score": soldier.efficiency_score,
                    "missions_completed": soldier.missions_completed,
                    "missions_failed": soldier.missions_failed,
                    "specialties": soldier.specialties
                }
                for name, soldier in self.soldiers.items()
            },
            "total_missions": len(self.mission_history),
            "overall_success_rate": sum(1 for m in self.mission_history if m["success"]) / len(self.mission_history) if self.mission_history else 0.0
        }
        
        # Add BOMBAD XP information!
        xp_roster = self.xp_system.get_army_roster()
        basic_status["xp_system"] = xp_roster
        
        # Add BOMBAD MENTORSHIP AND PROTECTION information!
        protection_status = self.protection_system.get_army_mentorship_status()
        basic_status["mentorship_system"] = protection_status
        
        return basic_status

# Global commander instance - mesa's supreme command!
SUPREME_COMMANDER = CommanderBossNass()

# Convenience functions for easy use
async def execute_mission(task: str, **kwargs) -> Dict[str, Any]:
    """Easy way to execute a mission through our command layer"""
    return await SUPREME_COMMANDER.execute_mission(task, **kwargs)

def get_army_status() -> Dict[str, Any]:
    """Get current army status"""
    return SUPREME_COMMANDER.get_army_status()

def register_new_soldier(soldier: Soldier):
    """Add a new soldier to the army"""
    SUPREME_COMMANDER.register_soldier(soldier)