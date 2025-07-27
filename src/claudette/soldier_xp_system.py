#!/usr/bin/env python3
"""
SOLDIER XP AND SKILL SYSTEM - RPG Style for AI Warriors!

Mesa design dis like proper RPG game! Each soldier gains XP in different skills:
- Fetching Water = Simple Tasks (Level 1-10)
- Building Castles = Medium Tasks (Level 10-25) 
- Developing Warp Drive = Advanced Tasks (Level 25-50)
- Saving Galaxy = Master Tasks (Level 50+)

Commander can see at glance: "Dis soldier Level 35 Python Warrior, perfect for warp drive!"
"""

import time
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum

class SkillCategory(Enum):
    """Different skill categories for our AI soldiers"""
    # Basic Skills (Fetching Water level)
    SIMPLE_QA = "simple_qa"           # Basic Q&A, hello world level
    TEXT_PROCESSING = "text_processing" # Simple text manipulation
    BASIC_MATH = "basic_math"         # Simple calculations
    
    # Intermediate Skills (Building Castles level)  
    PYTHON_CODING = "python_coding"   # Python programming
    WEB_DEVELOPMENT = "web_dev"       # HTML, CSS, basic web stuff
    DATA_ANALYSIS = "data_analysis"   # Working with data
    API_DESIGN = "api_design"         # REST APIs, endpoints
    
    # Advanced Skills (Warp Drive level)
    ALGORITHMS = "algorithms"         # Complex algorithms, optimization
    SYSTEM_DESIGN = "system_design"   # Architecture, scalability
    MACHINE_LEARNING = "ml"           # AI/ML implementation
    SECURITY = "security"             # Cybersecurity, encryption
    
    # Master Skills (Saving Galaxy level)
    DISTRIBUTED_SYSTEMS = "distributed" # Microservices, cloud architecture
    RESEARCH = "research"             # Complex research and analysis
    INNOVATION = "innovation"         # Novel solutions, creativity
    MENTORING = "mentoring"           # Teaching other soldiers

class MissionDifficulty(Enum):
    """Mission difficulty levels - like game difficulty"""
    FETCHING_WATER = 1      # Level 1-5 soldiers can handle
    BUILDING_SHED = 2       # Level 5-10 soldiers
    BUILDING_HOUSE = 3      # Level 10-15 soldiers  
    BUILDING_CASTLE = 4     # Level 15-25 soldiers
    BUILDING_CITY = 5       # Level 25-35 soldiers
    WARP_DRIVE = 6          # Level 35-45 soldiers
    TIME_TRAVEL = 7         # Level 45-55 soldiers
    SAVING_GALAXY = 8       # Level 55+ Master soldiers

@dataclass 
class SkillXP:
    """Individual skill with XP tracking"""
    category: SkillCategory
    current_xp: int = 0
    total_missions: int = 0
    successful_missions: int = 0
    failed_missions: int = 0
    best_performance_time: float = float('inf')
    worst_performance_time: float = 0.0
    average_performance_time: float = 0.0
    
    @property
    def level(self) -> int:
        """Calculate level based on XP - like RPG leveling!"""
        if self.current_xp < 100:
            return 1
        # XP needed for level = level^2 * 100
        # So level = sqrt(xp/100)
        return min(int(math.sqrt(self.current_xp / 100)) + 1, 99)
    
    @property
    def xp_for_next_level(self) -> int:
        """XP needed for next level"""
        next_level = self.level + 1
        next_level_xp = (next_level - 1) ** 2 * 100
        return next_level_xp - self.current_xp
    
    @property
    def success_rate(self) -> float:
        """Success rate for this specific skill"""
        if self.total_missions == 0:
            return 0.0
        return self.successful_missions / self.total_missions
    
    @property
    def skill_rating(self) -> str:
        """Human readable skill rating"""
        if self.level >= 50:
            return "🌟 MASTER"
        elif self.level >= 35:
            return "⚡ EXPERT" 
        elif self.level >= 20:
            return "🔥 ADVANCED"
        elif self.level >= 10:
            return "💪 INTERMEDIATE"
        elif self.level >= 5:
            return "📚 NOVICE"
        else:
            return "🥚 BEGINNER"

@dataclass
class SoldierXPProfile:
    """Complete XP profile for a soldier"""
    soldier_name: str
    skills: Dict[SkillCategory, SkillXP] = field(default_factory=dict)
    total_xp: int = 0
    overall_level: int = 1
    rank: str = "Recruit"
    badges: List[str] = field(default_factory=list)
    join_date: float = field(default_factory=time.time)
    
    def get_skill(self, category: SkillCategory) -> SkillXP:
        """Get skill, creating if it doesn't exist"""
        if category not in self.skills:
            self.skills[category] = SkillXP(category)
        return self.skills[category]
    
    def award_xp(self, category: SkillCategory, mission_success: bool, 
                 performance_time: float, xp_amount: int = None):
        """Award XP for completing a mission in specific skill"""
        skill = self.get_skill(category)
        
        # Calculate XP based on success and performance
        if xp_amount is None:
            base_xp = 50 if mission_success else 10
            # Bonus XP for fast completion (under 5 seconds = 50% bonus)
            time_bonus = max(0, (10 - performance_time) * 5) if performance_time < 10 else 0
            xp_amount = int(base_xp + time_bonus)
        
        # Update skill stats
        skill.current_xp += xp_amount
        skill.total_missions += 1
        
        if mission_success:
            skill.successful_missions += 1
        else:
            skill.failed_missions += 1
        
        # Update performance times
        skill.best_performance_time = min(skill.best_performance_time, performance_time)
        skill.worst_performance_time = max(skill.worst_performance_time, performance_time)
        
        # Recalculate average
        total_time = skill.average_performance_time * (skill.total_missions - 1) + performance_time
        skill.average_performance_time = total_time / skill.total_missions
        
        # Update total XP and overall level
        self.total_xp += xp_amount
        self._update_overall_level()
        self._check_for_promotions()
        self._check_for_badges(category, skill)
        
        return xp_amount
    
    def _update_overall_level(self):
        """Update overall soldier level based on total XP"""
        # Overall level is average of top 3 skills
        skill_levels = [skill.level for skill in self.skills.values()]
        if len(skill_levels) >= 3:
            top_3 = sorted(skill_levels, reverse=True)[:3]
            self.overall_level = int(sum(top_3) / 3)
        elif skill_levels:
            self.overall_level = int(sum(skill_levels) / len(skill_levels))
        else:
            self.overall_level = 1
    
    def _check_for_promotions(self):
        """Check if soldier deserves promotion in rank"""
        if self.overall_level >= 50:
            self.rank = "🌟 Grand Master"
        elif self.overall_level >= 40:
            self.rank = "⚡ Master Sergeant"
        elif self.overall_level >= 30:
            self.rank = "🔥 Staff Sergeant"
        elif self.overall_level >= 20:
            self.rank = "💪 Sergeant"
        elif self.overall_level >= 15:
            self.rank = "📚 Corporal"
        elif self.overall_level >= 10:
            self.rank = "🥉 Specialist"
        elif self.overall_level >= 5:
            self.rank = "🥈 Private First Class"
        else:
            self.rank = "🥚 Recruit"
    
    def _check_for_badges(self, category: SkillCategory, skill: SkillXP):
        """Award badges for achievements"""
        new_badges = []
        
        # Level badges
        if skill.level >= 50 and f"Master_{category.value}" not in self.badges:
            new_badges.append(f"Master_{category.value}")
        elif skill.level >= 25 and f"Expert_{category.value}" not in self.badges:
            new_badges.append(f"Expert_{category.value}")
        elif skill.level >= 10 and f"Specialist_{category.value}" not in self.badges:
            new_badges.append(f"Specialist_{category.value}")
        
        # Performance badges
        if skill.success_rate >= 0.95 and f"Perfectionist_{category.value}" not in self.badges:
            new_badges.append(f"Perfectionist_{category.value}")
        
        if skill.best_performance_time < 2.0 and f"SpeedRunner_{category.value}" not in self.badges:
            new_badges.append(f"SpeedRunner_{category.value}")
        
        # Mission count badges
        if skill.total_missions >= 100 and f"Veteran_{category.value}" not in self.badges:
            new_badges.append(f"Veteran_{category.value}")
        
        self.badges.extend(new_badges)
        return new_badges
    
    def get_best_skills(self, limit: int = 5) -> List[SkillXP]:
        """Get soldier's best skills, sorted by level"""
        return sorted(self.skills.values(), key=lambda s: s.level, reverse=True)[:limit]
    
    def can_handle_difficulty(self, difficulty: MissionDifficulty, required_skill: SkillCategory) -> bool:
        """Check if soldier can handle mission difficulty"""
        if required_skill not in self.skills:
            return difficulty.value <= 2  # Can only handle basic tasks without skill
        
        skill_level = self.skills[required_skill].level
        
        # Difficulty mapping to required levels
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
        
        return skill_level >= required_levels.get(difficulty, 1)
    
    def get_mission_confidence(self, difficulty: MissionDifficulty, required_skill: SkillCategory) -> float:
        """Get confidence score (0.0 to 1.0) for handling this mission"""
        if not self.can_handle_difficulty(difficulty, required_skill):
            return 0.0
        
        skill = self.get_skill(required_skill)
        
        # Base confidence from success rate
        confidence = skill.success_rate
        
        # Bonus from being overleveled
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
        level_bonus = min(0.3, (skill.level - required_level) * 0.02)
        
        return min(1.0, confidence + level_bonus)

class MissionClassifier:
    """Classify missions to determine difficulty and required skills"""
    
    def __init__(self):
        # Keywords that indicate different skill requirements
        self.skill_keywords = {
            SkillCategory.SIMPLE_QA: ["hello", "what is", "explain", "define", "basic question"],
            SkillCategory.TEXT_PROCESSING: ["text", "string", "parse", "format", "clean"],
            SkillCategory.BASIC_MATH: ["add", "subtract", "calculate", "math", "number"],
            
            SkillCategory.PYTHON_CODING: ["python", "function", "class", "script", "code"],
            SkillCategory.WEB_DEVELOPMENT: ["html", "css", "web", "frontend", "backend"],
            SkillCategory.DATA_ANALYSIS: ["data", "analysis", "pandas", "csv", "statistics"],
            SkillCategory.API_DESIGN: ["api", "rest", "endpoint", "http", "json"],
            
            SkillCategory.ALGORITHMS: ["algorithm", "optimize", "sort", "search", "complexity"],
            SkillCategory.SYSTEM_DESIGN: ["architecture", "system", "design", "scalable", "database"],
            SkillCategory.MACHINE_LEARNING: ["ml", "ai", "neural", "model", "train"],
            SkillCategory.SECURITY: ["security", "encryption", "auth", "secure", "vulnerability"],
            
            SkillCategory.DISTRIBUTED_SYSTEMS: ["microservice", "distributed", "cloud", "kubernetes"],
            SkillCategory.RESEARCH: ["research", "analyze", "investigate", "study"],
            SkillCategory.INNOVATION: ["creative", "innovative", "novel", "new approach"],
            SkillCategory.MENTORING: ["explain", "teach", "guide", "help understand"]
        }
        
        # Keywords that indicate difficulty level
        self.difficulty_keywords = {
            MissionDifficulty.FETCHING_WATER: ["hello", "simple", "basic", "easy"],
            MissionDifficulty.BUILDING_SHED: ["function", "small", "quick"],
            MissionDifficulty.BUILDING_HOUSE: ["class", "module", "medium"],
            MissionDifficulty.BUILDING_CASTLE: ["system", "application", "complex"],
            MissionDifficulty.BUILDING_CITY: ["architecture", "scalable", "advanced"],
            MissionDifficulty.WARP_DRIVE: ["optimize", "performance", "enterprise"],
            MissionDifficulty.TIME_TRAVEL: ["innovative", "research", "cutting-edge"],
            MissionDifficulty.SAVING_GALAXY: ["critical", "mission-critical", "production"]
        }
    
    def classify_mission(self, task_description: str) -> tuple[MissionDifficulty, SkillCategory]:
        """Classify mission and return difficulty + required skill"""
        task_lower = task_description.lower()
        
        # Determine required skill
        skill_scores = {}
        for skill, keywords in self.skill_keywords.items():
            score = sum(1 for keyword in keywords if keyword in task_lower)
            if score > 0:
                skill_scores[skill] = score
        
        # Default to simple QA if no specific skill detected
        required_skill = max(skill_scores.items(), key=lambda x: x[1])[0] if skill_scores else SkillCategory.SIMPLE_QA
        
        # Determine difficulty
        difficulty_scores = {}
        for difficulty, keywords in self.difficulty_keywords.items():
            score = sum(1 for keyword in keywords if keyword in task_lower)
            if score > 0:
                difficulty_scores[difficulty] = score
        
        # Default based on skill category if no difficulty keywords
        if not difficulty_scores:
            if required_skill in [SkillCategory.SIMPLE_QA, SkillCategory.TEXT_PROCESSING, SkillCategory.BASIC_MATH]:
                mission_difficulty = MissionDifficulty.FETCHING_WATER
            elif required_skill in [SkillCategory.PYTHON_CODING, SkillCategory.WEB_DEVELOPMENT]:
                mission_difficulty = MissionDifficulty.BUILDING_HOUSE
            elif required_skill in [SkillCategory.ALGORITHMS, SkillCategory.SYSTEM_DESIGN]:
                mission_difficulty = MissionDifficulty.WARP_DRIVE
            else:
                mission_difficulty = MissionDifficulty.BUILDING_CASTLE
        else:
            mission_difficulty = max(difficulty_scores.items(), key=lambda x: x[1])[0]
        
        return mission_difficulty, required_skill

class XPCommanderSystem:
    """Enhanced commander that uses XP system for soldier selection"""
    
    def __init__(self):
        self.soldier_profiles: Dict[str, SoldierXPProfile] = {}
        self.classifier = MissionClassifier()
    
    def register_soldier(self, soldier_name: str) -> SoldierXPProfile:
        """Register new soldier in XP system"""
        if soldier_name not in self.soldier_profiles:
            self.soldier_profiles[soldier_name] = SoldierXPProfile(soldier_name)
        return self.soldier_profiles[soldier_name]
    
    def select_best_soldier_for_mission(self, task_description: str) -> Optional[tuple[str, float, str]]:
        """Select best soldier for mission based on XP system"""
        difficulty, required_skill = self.classifier.classify_mission(task_description)
        
        best_soldier = None
        best_confidence = 0.0
        reasoning = ""
        
        for soldier_name, profile in self.soldier_profiles.items():
            confidence = profile.get_mission_confidence(difficulty, required_skill)
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_soldier = soldier_name
                
                skill = profile.get_skill(required_skill)
                reasoning = f"Level {skill.level} {required_skill.value} ({skill.skill_rating}, {confidence:.1%} confidence)"
        
        if best_soldier:
            return best_soldier, best_confidence, reasoning
        else:
            return None, 0.0, "No suitable soldiers available"
    
    def complete_mission(self, soldier_name: str, task_description: str, 
                        success: bool, performance_time: float):
        """Record mission completion and award XP"""
        if soldier_name not in self.soldier_profiles:
            self.register_soldier(soldier_name)
        
        profile = self.soldier_profiles[soldier_name]
        difficulty, required_skill = self.classifier.classify_mission(task_description)
        
        # Award XP
        xp_awarded = profile.award_xp(required_skill, success, performance_time)
        
        return {
            "xp_awarded": xp_awarded,
            "new_level": profile.get_skill(required_skill).level,
            "new_rank": profile.rank,
            "badges_earned": profile._check_for_badges(required_skill, profile.get_skill(required_skill))
        }
    
    def get_army_roster(self) -> Dict[str, Any]:
        """Get complete army roster with XP info"""
        roster = {}
        
        for name, profile in self.soldier_profiles.items():
            best_skills = profile.get_best_skills(3)
            roster[name] = {
                "overall_level": profile.overall_level,
                "rank": profile.rank,
                "total_xp": profile.total_xp,
                "badges_count": len(profile.badges),
                "best_skills": [
                    {
                        "skill": skill.category.value,
                        "level": skill.level,
                        "rating": skill.skill_rating,
                        "success_rate": f"{skill.success_rate:.1%}",
                        "missions": skill.total_missions
                    }
                    for skill in best_skills
                ],
                "specialization": best_skills[0].category.value if best_skills else "None"
            }
        
        return roster

# Global XP system instance
GLOBAL_XP_SYSTEM = XPCommanderSystem()