#!/usr/bin/env python3
"""
MENTORSHIP AND ROOKIE PROTECTION SYSTEM

Mesa design dis like proper Gungan army! No sending young Jar Jar against Trade Federation alone!
Experienced warriors teach rookies, protect them from wounds, build strong army!

Key principles:
- Rookies NEVER face dangerous missions alone
- Veterans mentor and guide inexperienced soldiers  
- Gradual skill progression with safety nets
- Wounded soldiers get recovery time and easier missions
- Strong bonds between mentor and student for army morale
"""

import time
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .soldier_xp_system import (
    SkillCategory, MissionDifficulty, SoldierXPProfile, 
    SkillXP, GLOBAL_XP_SYSTEM
)

class MentorshipStatus(Enum):
    """Different mentorship relationships"""
    ROOKIE = "rookie"           # New soldier, needs mentor
    STUDENT = "student"         # Learning under mentor
    INDEPENDENT = "independent" # Can handle missions alone
    MENTOR = "mentor"          # Teaching other soldiers
    VETERAN = "veteran"        # Senior mentor, teaches mentors
    WOUNDED = "wounded"        # Needs recovery and easier missions

class SafetyLevel(Enum):
    """How safe is this mission for a soldier?"""
    SAFE = "safe"              # Well within soldier's capabilities
    MODERATE = "moderate"      # Challenging but manageable
    RISKY = "risky"           # At edge of soldier's skills
    DANGEROUS = "dangerous"    # Above soldier's level - needs mentor
    LETHAL = "lethal"         # Way too hard - will cause injury

@dataclass
class MentorshipBond:
    """Relationship between mentor and student"""
    mentor_name: str
    student_name: str
    skill_category: SkillCategory
    bond_strength: float = 0.0  # 0.0 to 1.0, higher = better teaching
    missions_together: int = 0
    student_successes: int = 0
    student_failures: int = 0
    mentoring_start_time: float = field(default_factory=time.time)
    
    @property
    def teaching_effectiveness(self) -> float:
        """How effective is this mentorship? (0.0 to 1.0)"""
        if self.missions_together == 0:
            return 0.5  # Starting effectiveness
        
        success_rate = self.student_successes / self.missions_together
        # Bond strength improves teaching effectiveness
        return min(1.0, success_rate * 0.7 + self.bond_strength * 0.3)
    
    @property
    def mentorship_duration_days(self) -> float:
        """How long has this mentorship lasted?"""
        return (time.time() - self.mentoring_start_time) / 86400  # Convert to days

@dataclass
class SoldierWellbeing:
    """Track soldier's health and morale"""
    soldier_name: str
    wounds: List[str] = field(default_factory=list)  # What injuries they have
    morale: float = 1.0  # 0.0 to 1.0, affects performance
    stress_level: float = 0.0  # 0.0 to 1.0, higher = more stressed
    recovery_time: float = 0.0  # Time needed for recovery
    consecutive_failures: int = 0
    last_success_time: float = field(default_factory=time.time)
    
    @property
    def is_wounded(self) -> bool:
        """Is soldier currently wounded?"""
        return len(self.wounds) > 0 or self.recovery_time > 0
    
    @property
    def combat_effectiveness(self) -> float:
        """How effective is soldier in combat? (0.0 to 1.0)"""
        health_factor = 1.0 - len(self.wounds) * 0.2  # Each wound reduces effectiveness
        morale_factor = self.morale
        stress_factor = 1.0 - self.stress_level * 0.3
        
        return max(0.1, health_factor * morale_factor * stress_factor)

class RookieProtectionSystem:
    """System to protect inexperienced soldiers and promote mentorship"""
    
    def __init__(self):
        self.mentorship_bonds: List[MentorshipBond] = []
        self.soldier_wellbeing: Dict[str, SoldierWellbeing] = {}
        
        # Safety thresholds
        self.min_level_for_independence = 10  # Level 10+ can work alone on easy missions
        self.min_level_for_mentoring = 20     # Level 20+ can mentor others
        self.veteran_level = 35               # Level 35+ are veterans
        
        # Mission safety rules
        self.safe_level_buffer = 5            # Must be 5+ levels above mission requirement
        self.mentor_level_buffer = 10         # Mentor must be 10+ levels above mission
    
    def get_wellbeing(self, soldier_name: str) -> SoldierWellbeing:
        """Get soldier's wellbeing, creating if needed"""
        if soldier_name not in self.soldier_wellbeing:
            self.soldier_wellbeing[soldier_name] = SoldierWellbeing(soldier_name)
        return self.soldier_wellbeing[soldier_name]
    
    def assess_mission_safety(self, soldier_name: str, difficulty: MissionDifficulty, 
                            skill: SkillCategory) -> SafetyLevel:
        """Assess how safe this mission is for the soldier"""
        # Get soldier's profile and skill level
        if soldier_name not in GLOBAL_XP_SYSTEM.soldier_profiles:
            return SafetyLevel.LETHAL  # Unknown soldier = dangerous
        
        profile = GLOBAL_XP_SYSTEM.soldier_profiles[soldier_name]
        soldier_skill = profile.get_skill(skill)
        
        # Required level for this difficulty
        required_levels = {
            MissionDifficulty.FETCHING_WATER: 1,
            MissionDifficulty.BUILDING_SHED: 5,
            MissionDifficulty.BUILDING_HOUSE: 10,
            MissionDifficulty.BUILDING_CASTLE: 15,
            MissionDifficulty.BUILDING_CITY: 25,
            MissionDifficulty.WARP_DRIVE: 35,
            MissionDifficulty.TIME_TRAVEL: 45,
            MissionDifficulty.SAVING_GALAXY: 55
        }
        
        required_level = required_levels.get(difficulty, 1)
        level_difference = soldier_skill.level - required_level
        
        # Factor in soldier's wellbeing
        wellbeing = self.get_wellbeing(soldier_name)
        if wellbeing.is_wounded:
            level_difference -= 5  # Wounded soldiers are less effective
        
        # Determine safety level
        if level_difference >= self.safe_level_buffer:
            return SafetyLevel.SAFE
        elif level_difference >= 0:
            return SafetyLevel.MODERATE
        elif level_difference >= -3:
            return SafetyLevel.RISKY
        elif level_difference >= -8:
            return SafetyLevel.DANGEROUS
        else:
            return SafetyLevel.LETHAL
    
    def get_mentorship_status(self, soldier_name: str) -> MentorshipStatus:
        """Determine soldier's mentorship status"""
        if soldier_name not in GLOBAL_XP_SYSTEM.soldier_profiles:
            return MentorshipStatus.ROOKIE
        
        profile = GLOBAL_XP_SYSTEM.soldier_profiles[soldier_name]
        wellbeing = self.get_wellbeing(soldier_name)
        
        # Check if wounded
        if wellbeing.is_wounded:
            return MentorshipStatus.WOUNDED
        
        # Check if has active students
        active_mentorships = [b for b in self.mentorship_bonds if b.mentor_name == soldier_name]
        
        # Determine status based on level and experience
        if profile.overall_level >= self.veteran_level:
            return MentorshipStatus.VETERAN
        elif profile.overall_level >= self.min_level_for_mentoring or active_mentorships:
            return MentorshipStatus.MENTOR
        elif profile.overall_level >= self.min_level_for_independence:
            return MentorshipStatus.INDEPENDENT
        else:
            # Check if has active mentor
            active_student_bonds = [b for b in self.mentorship_bonds if b.student_name == soldier_name]
            if active_student_bonds:
                return MentorshipStatus.STUDENT
            else:
                return MentorshipStatus.ROOKIE
    
    def find_suitable_mentor(self, rookie_name: str, skill_category: SkillCategory) -> Optional[str]:
        """Find best mentor for a rookie in specific skill"""
        # Get all potential mentors
        potential_mentors = []
        
        for soldier_name, profile in GLOBAL_XP_SYSTEM.soldier_profiles.items():
            if soldier_name == rookie_name:
                continue  # Can't mentor yourself
            
            status = self.get_mentorship_status(soldier_name)
            if status not in [MentorshipStatus.MENTOR, MentorshipStatus.VETERAN]:
                continue  # Must be qualified to mentor
            
            skill = profile.get_skill(skill_category)
            if skill.level < self.min_level_for_mentoring:
                continue  # Must be high enough level in this skill
            
            # Count current students
            current_students = len([b for b in self.mentorship_bonds 
                                  if b.mentor_name == soldier_name])
            
            # Veterans can handle more students
            max_students = 3 if status == MentorshipStatus.VETERAN else 2
            if current_students >= max_students:
                continue  # Already has max students
            
            potential_mentors.append((soldier_name, skill.level, current_students))
        
        if not potential_mentors:
            return None
        
        # Choose best mentor: highest skill level, fewest students
        potential_mentors.sort(key=lambda x: (x[1], -x[2]), reverse=True)
        return potential_mentors[0][0]
    
    def create_mentorship(self, mentor_name: str, student_name: str, 
                         skill_category: SkillCategory) -> MentorshipBond:
        """Create new mentorship bond"""
        bond = MentorshipBond(mentor_name, student_name, skill_category)
        self.mentorship_bonds.append(bond)
        
        # Boost student morale
        student_wellbeing = self.get_wellbeing(student_name)
        student_wellbeing.morale = min(1.0, student_wellbeing.morale + 0.2)
        
        return bond
    
    def safe_mission_assignment(self, mission_task: str) -> Dict[str, Any]:
        """Assign mission with rookie protection and mentorship"""
        # Classify mission
        difficulty, skill = GLOBAL_XP_SYSTEM.classifier.classify_mission(mission_task)
        
        assignment_result = {
            "mission_task": mission_task,
            "difficulty": difficulty.name,
            "required_skill": skill.value,
            "soldiers_assigned": [],
            "mentorship_used": False,
            "safety_measures": [],
            "assignment_reasoning": ""
        }
        
        # Find all soldiers and assess safety
        soldier_assessments = []
        
        for soldier_name in GLOBAL_XP_SYSTEM.soldier_profiles.keys():
            safety = self.assess_mission_safety(soldier_name, difficulty, skill)
            status = self.get_mentorship_status(soldier_name)
            wellbeing = self.get_wellbeing(soldier_name)
            
            soldier_assessments.append({
                "name": soldier_name,
                "safety": safety,
                "status": status,
                "wellbeing": wellbeing,
                "effectiveness": wellbeing.combat_effectiveness
            })
        
        # Sort by safety and effectiveness
        soldier_assessments.sort(key=lambda x: (
            x["safety"].value,  # Safer first
            -x["effectiveness"]  # More effective first
        ))
        
        # Assignment strategy
        safe_soldiers = [s for s in soldier_assessments if s["safety"] == SafetyLevel.SAFE]
        moderate_soldiers = [s for s in soldier_assessments if s["safety"] == SafetyLevel.MODERATE]
        risky_soldiers = [s for s in soldier_assessments if s["safety"] == SafetyLevel.RISKY]
        
        if safe_soldiers:
            # Assign safest, most effective soldier
            chosen = safe_soldiers[0]
            assignment_result["soldiers_assigned"] = [chosen["name"]]
            assignment_result["assignment_reasoning"] = f"Safe assignment: {chosen['name']} can handle this mission safely"
            
        elif moderate_soldiers:
            # Check if we have a mentor available for support
            moderate_soldier = moderate_soldiers[0]
            
            if moderate_soldier["status"] in [MentorshipStatus.ROOKIE, MentorshipStatus.STUDENT]:
                # Rookie/student needs mentor for moderate mission
                mentor = self.find_suitable_mentor(moderate_soldier["name"], skill)
                
                if mentor:
                    assignment_result["soldiers_assigned"] = [mentor, moderate_soldier["name"]]
                    assignment_result["mentorship_used"] = True
                    assignment_result["assignment_reasoning"] = f"Mentored mission: {mentor} guides {moderate_soldier['name']}"
                    assignment_result["safety_measures"].append("Mentor accompanies student")
                    
                    # Create or strengthen mentorship bond
                    existing_bond = next((b for b in self.mentorship_bonds 
                                        if b.mentor_name == mentor and b.student_name == moderate_soldier["name"]), None)
                    if not existing_bond:
                        self.create_mentorship(mentor, moderate_soldier["name"], skill)
                else:
                    # No mentor available - reject mission for rookie safety
                    assignment_result["assignment_reasoning"] = "MISSION REJECTED: Rookie needs mentor but none available"
                    assignment_result["safety_measures"].append("Mission postponed for rookie safety")
            else:
                # Independent/mentor can handle moderate mission alone
                assignment_result["soldiers_assigned"] = [moderate_soldier["name"]]
                assignment_result["assignment_reasoning"] = f"Moderate challenge: {moderate_soldier['name']} can handle with care"
                
        elif risky_soldiers:
            # Risky missions need strong mentor + student team
            risky_soldier = risky_soldiers[0]
            
            if risky_soldier["status"] in [MentorshipStatus.MENTOR, MentorshipStatus.VETERAN]:
                # Experienced soldier can take calculated risk
                assignment_result["soldiers_assigned"] = [risky_soldier["name"]]
                assignment_result["assignment_reasoning"] = f"Calculated risk: Experienced {risky_soldier['name']} attempts challenging mission"
                assignment_result["safety_measures"].append("Increased monitoring for experienced soldier")
            else:
                # Find veteran mentor for high-risk mission
                veteran_mentor = None
                for soldier_name, profile in GLOBAL_XP_SYSTEM.soldier_profiles.items():
                    if (self.get_mentorship_status(soldier_name) == MentorshipStatus.VETERAN and
                        self.assess_mission_safety(soldier_name, difficulty, skill) in [SafetyLevel.SAFE, SafetyLevel.MODERATE]):
                        veteran_mentor = soldier_name
                        break
                
                if veteran_mentor:
                    assignment_result["soldiers_assigned"] = [veteran_mentor, risky_soldier["name"]]
                    assignment_result["mentorship_used"] = True
                    assignment_result["assignment_reasoning"] = f"High-risk mentored mission: Veteran {veteran_mentor} protects {risky_soldier['name']}"
                    assignment_result["safety_measures"].extend([
                        "Veteran mentor leads mission",
                        "Student provides support only",
                        "Abort if conditions worsen"
                    ])
                else:
                    assignment_result["assignment_reasoning"] = "MISSION REJECTED: Too risky, no veteran mentor available"
        
        else:
            # All soldiers find this dangerous/lethal
            assignment_result["assignment_reasoning"] = "MISSION REJECTED: Beyond current army capabilities"
            assignment_result["safety_measures"].append("Army needs more training before attempting")
        
        return assignment_result
    
    def record_mission_outcome(self, soldiers: List[str], success: bool, 
                              performance_time: float, injuries: List[str] = None):
        """Record mission outcome and update soldier wellbeing"""
        injuries = injuries or []
        
        for soldier_name in soldiers:
            wellbeing = self.get_wellbeing(soldier_name)
            
            if success:
                # Success improves morale and reduces stress
                wellbeing.morale = min(1.0, wellbeing.morale + 0.1)
                wellbeing.stress_level = max(0.0, wellbeing.stress_level - 0.1)
                wellbeing.consecutive_failures = 0
                wellbeing.last_success_time = time.time()
                
                # Update mentorship bonds
                for bond in self.mentorship_bonds:
                    if soldier_name == bond.student_name and len(soldiers) > 1:
                        # Student succeeded with mentor
                        bond.missions_together += 1
                        bond.student_successes += 1
                        bond.bond_strength = min(1.0, bond.bond_strength + 0.1)
                    elif soldier_name == bond.mentor_name and len(soldiers) > 1:
                        # Mentor helped student succeed
                        bond.bond_strength = min(1.0, bond.bond_strength + 0.05)
                        
            else:
                # Failure damages morale and increases stress
                wellbeing.morale = max(0.1, wellbeing.morale - 0.15)
                wellbeing.stress_level = min(1.0, wellbeing.stress_level + 0.2)
                wellbeing.consecutive_failures += 1
                
                # Add injuries if any
                if soldier_name in injuries:
                    wound_description = f"Mission failure injury at {time.time()}"
                    wellbeing.wounds.append(wound_description)
                    wellbeing.recovery_time = max(wellbeing.recovery_time, 24 * 3600)  # 24 hours recovery
                
                # Update mentorship bonds
                for bond in self.mentorship_bonds:
                    if soldier_name == bond.student_name and len(soldiers) > 1:
                        # Student failed despite mentor
                        bond.missions_together += 1
                        bond.student_failures += 1
                        bond.bond_strength = max(0.0, bond.bond_strength - 0.05)
    
    def get_army_mentorship_status(self) -> Dict[str, Any]:
        """Get complete mentorship and wellbeing status"""
        status = {
            "total_mentorship_bonds": len(self.mentorship_bonds),
            "soldiers_by_status": {},
            "active_mentorships": [],
            "soldier_wellbeing": {},
            "army_health": {
                "wounded_count": 0,
                "average_morale": 0.0,
                "stress_level": 0.0
            }
        }
        
        # Count soldiers by status
        status_counts = {}
        total_morale = 0.0
        total_stress = 0.0
        soldier_count = 0
        
        for soldier_name in GLOBAL_XP_SYSTEM.soldier_profiles.keys():
            mentorship_status = self.get_mentorship_status(soldier_name)
            wellbeing = self.get_wellbeing(soldier_name)
            
            status_counts[mentorship_status.value] = status_counts.get(mentorship_status.value, 0) + 1
            
            if wellbeing.is_wounded:
                status["army_health"]["wounded_count"] += 1
            
            total_morale += wellbeing.morale
            total_stress += wellbeing.stress_level
            soldier_count += 1
            
            status["soldier_wellbeing"][soldier_name] = {
                "status": mentorship_status.value,
                "morale": wellbeing.morale,
                "stress": wellbeing.stress_level,
                "wounds": len(wellbeing.wounds),
                "effectiveness": wellbeing.combat_effectiveness,
                "consecutive_failures": wellbeing.consecutive_failures
            }
        
        status["soldiers_by_status"] = status_counts
        
        if soldier_count > 0:
            status["army_health"]["average_morale"] = total_morale / soldier_count
            status["army_health"]["stress_level"] = total_stress / soldier_count
        
        # Active mentorships
        for bond in self.mentorship_bonds:
            status["active_mentorships"].append({
                "mentor": bond.mentor_name,
                "student": bond.student_name,
                "skill": bond.skill_category.value,
                "effectiveness": bond.teaching_effectiveness,
                "missions_together": bond.missions_together,
                "bond_strength": bond.bond_strength,
                "duration_days": bond.mentorship_duration_days
            })
        
        return status

# Global protection system
GLOBAL_PROTECTION_SYSTEM = RookieProtectionSystem()