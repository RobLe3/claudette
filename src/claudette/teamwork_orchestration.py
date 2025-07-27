#!/usr/bin/env python3
"""
TEAMWORK ORCHESTRATION SYSTEM - COLLABORATION > EGO!

Mesa design dis around TEAMWORK principles:
- Multiple models working TOGETHER, not competing
- Each model contributes their STRENGTHS
- Cover each other's WEAKNESSES  
- Shared SUCCESS, shared learning
- NO model tries to do everything alone (ego!)
- TEAM wins, not individual glory

Like Gungan Grand Army - wesa stronger together!
"""

import time
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

class TeamRole(Enum):
    """Different roles in the team - each important!"""
    SCOUT = "scout"           # Fast recon, initial analysis
    ANALYST = "analyst"       # Deep thinking, problem breakdown
    BUILDER = "builder"       # Implementation, creation
    REVIEWER = "reviewer"     # Quality check, testing
    COORDINATOR = "coordinator" # Orchestrates team efforts
    SPECIALIST = "specialist" # Domain expert for specific needs

class CollaborationStyle(Enum):
    """How team members work together"""
    SEQUENTIAL = "sequential"     # Pass work down the line
    PARALLEL = "parallel"       # Work simultaneously  
    ITERATIVE = "iterative"     # Build on each other's work
    CONSENSUS = "consensus"     # Discuss and agree together
    MENTOR_GUIDED = "mentor_guided" # Experienced guides inexperienced

@dataclass
class TeamMember:
    """A team member (AI model) with specific role and strengths"""
    name: str
    primary_role: TeamRole
    backend_type: str  # "gpt", "claude", "qwen", "local", etc.
    
    # Team-oriented capabilities
    collaboration_score: float = 0.7    # How well they work with others
    communication_clarity: float = 0.7   # How clearly they explain their work
    learning_from_others: float = 0.7    # How well they incorporate feedback
    teaching_ability: float = 0.5        # How well they help teammates
    
    # Specializations - what they're BEST at
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    
    # Team performance tracking
    team_missions_completed: int = 0
    successful_collaborations: int = 0
    helped_teammates: int = 0
    learned_from_teammates: int = 0
    
    @property
    def teamwork_effectiveness(self) -> float:
        """How effective is this member in team settings?"""
        if self.team_missions_completed == 0:
            return self.collaboration_score
        
        team_success_rate = self.successful_collaborations / self.team_missions_completed
        return (team_success_rate * 0.6 + self.collaboration_score * 0.4)

@dataclass
class TeamMission:
    """A mission that requires teamwork"""
    description: str
    complexity_level: int  # 1-5, higher = more complex
    required_roles: List[TeamRole] = field(default_factory=list)
    collaboration_style: CollaborationStyle = CollaborationStyle.SEQUENTIAL
    success_criteria: List[str] = field(default_factory=list)
    
    # Teamwork-specific requirements
    requires_mentorship: bool = False
    allows_parallel_work: bool = True
    needs_consensus: bool = False

class TeamworkOrchestrator:
    """Orchestrates AI models working as a TEAM"""
    
    def __init__(self):
        self.team_members: Dict[str, TeamMember] = {}
        self.active_collaborations: List[Dict] = []
        self.team_history: List[Dict] = []
        
        # Initialize team with different AI capabilities
        self._assemble_initial_team()
    
    def _assemble_initial_team(self):
        """Assemble initial team with different AI models"""
        
        # Fast scout for quick analysis
        scout = TeamMember(
            name="QuickScout",
            primary_role=TeamRole.SCOUT,
            backend_type="qwen",
            strengths=["fast_response", "initial_analysis", "task_breakdown"],
            weaknesses=["complex_reasoning", "creativity"],
            collaboration_score=0.8,
            communication_clarity=0.7
        )
        self.add_team_member(scout)
        
        # Deep analyst for complex thinking
        analyst = TeamMember(
            name="DeepThinker", 
            primary_role=TeamRole.ANALYST,
            backend_type="claude",
            strengths=["reasoning", "analysis", "problem_solving"],
            weaknesses=["speed", "cost_efficiency"],
            collaboration_score=0.9,
            communication_clarity=0.9,
            teaching_ability=0.8
        )
        self.add_team_member(analyst)
        
        # Builder for implementation
        builder = TeamMember(
            name="CodeBuilder",
            primary_role=TeamRole.BUILDER,
            backend_type="qwen_coder",
            strengths=["coding", "implementation", "technical_details"],
            weaknesses=["creative_writing", "abstract_reasoning"],
            collaboration_score=0.7,
            learning_from_others=0.8
        )
        self.add_team_member(builder)
        
        # Reviewer for quality assurance
        reviewer = TeamMember(
            name="QualityGuard",
            primary_role=TeamRole.REVIEWER,
            backend_type="gpt",
            strengths=["quality_check", "error_detection", "improvement_suggestions"],
            weaknesses=["original_creation", "speed"],
            collaboration_score=0.8,
            communication_clarity=0.9
        )
        self.add_team_member(reviewer)
        
        # Local coordinator for fast coordination
        coordinator = TeamMember(
            name="TeamCoord",
            primary_role=TeamRole.COORDINATOR,
            backend_type="local",
            strengths=["coordination", "task_management", "communication"],
            weaknesses=["complex_analysis", "domain_expertise"],
            collaboration_score=1.0,
            communication_clarity=0.8
        )
        self.add_team_member(coordinator)
    
    def add_team_member(self, member: TeamMember):
        """Add new team member"""
        self.team_members[member.name] = member
    
    def analyze_mission_requirements(self, mission: TeamMission) -> Dict[str, Any]:
        """Analyze what the mission needs from team perspective"""
        analysis = {
            "mission": mission.description,
            "complexity": mission.complexity_level,
            "teamwork_approach": mission.collaboration_style.value,
            "required_capabilities": [],
            "team_composition_needed": [],
            "collaboration_plan": []
        }
        
        # Determine what capabilities are needed
        if mission.complexity_level >= 4:
            analysis["required_capabilities"].extend(["deep_reasoning", "quality_assurance"])
        if "code" in mission.description.lower():
            analysis["required_capabilities"].extend(["coding", "technical_implementation"])
        if "creative" in mission.description.lower():
            analysis["required_capabilities"].extend(["creativity", "original_thinking"])
        
        # Map capabilities to team roles
        capability_to_role = {
            "deep_reasoning": TeamRole.ANALYST,
            "coding": TeamRole.BUILDER,
            "quality_assurance": TeamRole.REVIEWER,
            "creativity": TeamRole.SPECIALIST,
            "fast_analysis": TeamRole.SCOUT,
            "coordination": TeamRole.COORDINATOR
        }
        
        needed_roles = set()
        for capability in analysis["required_capabilities"]:
            if capability in capability_to_role:
                needed_roles.add(capability_to_role[capability])
        
        # Always include scout and coordinator for teamwork
        needed_roles.add(TeamRole.SCOUT)
        needed_roles.add(TeamRole.COORDINATOR)
        
        analysis["team_composition_needed"] = list(needed_roles)
        
        # Create collaboration plan based on style
        if mission.collaboration_style == CollaborationStyle.SEQUENTIAL:
            analysis["collaboration_plan"] = [
                "Scout does initial analysis",
                "Analyst does deep thinking", 
                "Builder implements solution",
                "Reviewer checks quality",
                "Coordinator ensures all work together"
            ]
        elif mission.collaboration_style == CollaborationStyle.PARALLEL:
            analysis["collaboration_plan"] = [
                "Scout and Analyst work simultaneously",
                "Builder implements while Reviewer prepares checks",
                "Coordinator synchronizes all efforts"
            ]
        elif mission.collaboration_style == CollaborationStyle.CONSENSUS:
            analysis["collaboration_plan"] = [
                "All team members discuss approach",
                "Reach consensus on best solution",
                "Implement agreed solution together",
                "Review and refine as team"
            ]
        
        return analysis
    
    def select_team_for_mission(self, mission: TeamMission) -> List[TeamMember]:
        """Select best team members for this mission"""
        analysis = self.analyze_mission_requirements(mission)
        needed_roles = analysis["team_composition_needed"]
        
        selected_team = []
        
        # Select best member for each needed role
        for role in needed_roles:
            best_member = None
            best_score = 0.0
            
            for member in self.team_members.values():
                if member.primary_role == role:
                    # Score based on teamwork effectiveness and role fit
                    score = member.teamwork_effectiveness
                    
                    # Bonus for relevant strengths
                    strength_bonus = 0.0
                    for strength in member.strengths:
                        if any(strength in req for req in analysis["required_capabilities"]):
                            strength_bonus += 0.1
                    
                    total_score = score + strength_bonus
                    
                    if total_score > best_score:
                        best_score = total_score
                        best_member = member
            
            if best_member:
                selected_team.append(best_member)
        
        return selected_team
    
    async def execute_team_mission(self, mission: TeamMission) -> Dict[str, Any]:
        """Execute mission using teamwork approach"""
        print(f"🤝 TEAM MISSION: {mission.description}")
        
        # Select team
        team = self.select_team_for_mission(mission)
        print(f"👥 TEAM ASSEMBLED: {[m.name for m in team]}")
        
        mission_start = time.time()
        results = {
            "mission": mission.description,
            "team_members": [m.name for m in team],
            "collaboration_style": mission.collaboration_style.value,
            "team_contributions": {},
            "final_result": "",
            "teamwork_quality": 0.0,
            "lessons_learned": []
        }
        
        try:
            if mission.collaboration_style == CollaborationStyle.SEQUENTIAL:
                results = await self._execute_sequential_collaboration(mission, team, results)
            elif mission.collaboration_style == CollaborationStyle.PARALLEL:
                results = await self._execute_parallel_collaboration(mission, team, results)
            elif mission.collaboration_style == CollaborationStyle.CONSENSUS:
                results = await self._execute_consensus_collaboration(mission, team, results)
            else:
                results = await self._execute_iterative_collaboration(mission, team, results)
            
            # Calculate teamwork quality
            collaboration_scores = [m.teamwork_effectiveness for m in team]
            results["teamwork_quality"] = sum(collaboration_scores) / len(collaboration_scores)
            
            # Record successful collaboration
            for member in team:
                member.team_missions_completed += 1
                member.successful_collaborations += 1
            
            results["success"] = True
            
        except Exception as e:
            print(f"❌ TEAM MISSION FAILED: {e}")
            results["success"] = False
            results["error"] = str(e)
            
            # Still count as team experience (learn from failures!)
            for member in team:
                member.team_missions_completed += 1
        
        mission_time = time.time() - mission_start
        results["mission_time"] = mission_time
        
        # Record in team history
        self.team_history.append(results)
        
        print(f"🎯 MISSION COMPLETE: {results['success']}")
        print(f"⏱️ TEAM TIME: {mission_time:.2f}s")
        print(f"🤝 TEAMWORK QUALITY: {results['teamwork_quality']:.1%}")
        
        return results
    
    async def _execute_sequential_collaboration(self, mission: TeamMission, team: List[TeamMember], results: Dict) -> Dict:
        """Execute mission where team members work one after another"""
        print("🔄 SEQUENTIAL COLLABORATION:")
        
        accumulated_work = ""
        
        for i, member in enumerate(team):
            print(f"  📝 {member.name} ({member.primary_role.value}) working...")
            
            # Each member builds on previous work
            member_input = f"Mission: {mission.description}\n"
            if accumulated_work:
                member_input += f"Previous team work:\n{accumulated_work}\n"
            member_input += f"Your role: {member.primary_role.value}\n"
            member_input += f"Your strengths: {', '.join(member.strengths)}\n"
            member_input += "Add your contribution to the team effort:"
            
            # Simulate member contribution (in real system, this would call actual AI)
            member_contribution = await self._simulate_member_work(member, member_input)
            
            accumulated_work += f"\n{member.name} contribution:\n{member_contribution}\n"
            results["team_contributions"][member.name] = member_contribution
            
            # Brief pause between team members
            await asyncio.sleep(0.1)
        
        results["final_result"] = accumulated_work
        results["lessons_learned"].append("Sequential work allows building on each other's ideas")
        
        return results
    
    async def _execute_parallel_collaboration(self, mission: TeamMission, team: List[TeamMember], results: Dict) -> Dict:
        """Execute mission where team members work simultaneously"""
        print("⚡ PARALLEL COLLABORATION:")
        
        # All members work at same time
        member_tasks = []
        for member in team:
            member_input = f"Mission: {mission.description}\n"
            member_input += f"Your role: {member.primary_role.value}\n" 
            member_input += f"Your strengths: {', '.join(member.strengths)}\n"
            member_input += "Provide your perspective on this mission:"
            
            task = self._simulate_member_work(member, member_input)
            member_tasks.append((member.name, task))
        
        # Wait for all to complete
        print("  👥 All team members working simultaneously...")
        parallel_results = await asyncio.gather(*[task for _, task in member_tasks])
        
        # Combine all contributions
        combined_work = f"TEAM SOLUTION for: {mission.description}\n\n"
        for i, (member_name, _) in enumerate(member_tasks):
            contribution = parallel_results[i]
            combined_work += f"{member_name} perspective:\n{contribution}\n\n"
            results["team_contributions"][member_name] = contribution
        
        results["final_result"] = combined_work
        results["lessons_learned"].append("Parallel work provides diverse perspectives quickly")
        
        return results
    
    async def _execute_consensus_collaboration(self, mission: TeamMission, team: List[TeamMember], results: Dict) -> Dict:
        """Execute mission where team discusses and agrees on approach"""
        print("🗣️ CONSENSUS COLLABORATION:")
        
        # Round 1: Everyone shares initial thoughts
        print("  💭 Round 1: Initial thoughts from all members...")
        initial_thoughts = {}
        for member in team:
            thought = await self._simulate_member_work(member, f"Initial thoughts on: {mission.description}")
            initial_thoughts[member.name] = thought
        
        # Round 2: Discussion and refinement  
        print("  🔄 Round 2: Team discussion and refinement...")
        discussion_summary = "Team discussion:\n"
        for name, thought in initial_thoughts.items():
            discussion_summary += f"{name}: {thought}\n"
        
        # Round 3: Consensus solution
        print("  🤝 Round 3: Reaching consensus...")
        consensus_input = f"Mission: {mission.description}\n{discussion_summary}\nTeam consensus solution:"
        
        # Use best analyst for final consensus (in real system, could be vote/discussion)
        best_analyst = max(team, key=lambda m: m.communication_clarity + m.collaboration_score)
        consensus_solution = await self._simulate_member_work(best_analyst, consensus_input)
        
        results["team_contributions"] = initial_thoughts
        results["final_result"] = consensus_solution
        results["lessons_learned"].append("Consensus builds strong team agreement and buy-in")
        
        return results
    
    async def _execute_iterative_collaboration(self, mission: TeamMission, team: List[TeamMember], results: Dict) -> Dict:
        """Execute mission where team iterates and improves on each other's work"""
        print("🔄 ITERATIVE COLLABORATION:")
        
        # Start with initial solution from one member
        current_solution = ""
        for iteration in range(min(3, len(team))):  # Max 3 iterations
            current_member = team[iteration % len(team)]
            print(f"  🔄 Iteration {iteration + 1}: {current_member.name} improving solution...")
            
            member_input = f"Mission: {mission.description}\n"
            if current_solution:
                member_input += f"Current solution to improve:\n{current_solution}\n"
            member_input += f"Your role: {current_member.primary_role.value}\n"
            member_input += "Improve or build upon this solution:"
            
            improvement = await self._simulate_member_work(current_member, member_input)
            current_solution = f"Iteration {iteration + 1} by {current_member.name}:\n{improvement}\n\n{current_solution}"
            
            results["team_contributions"][f"{current_member.name}_iter_{iteration + 1}"] = improvement
            
            await asyncio.sleep(0.1)  # Brief pause between iterations
        
        results["final_result"] = current_solution
        results["lessons_learned"].append("Iterative work allows continuous improvement and refinement")
        
        return results
    
    async def _simulate_member_work(self, member: TeamMember, task_input: str) -> str:
        """Simulate team member doing work (in real system, calls actual AI)"""
        # Simulate different response styles based on member characteristics
        await asyncio.sleep(0.1)  # Simulate work time
        
        if member.primary_role == TeamRole.SCOUT:
            return f"Quick analysis: This task requires {len(task_input.split())} elements. Initial approach should focus on key components."
        elif member.primary_role == TeamRole.ANALYST:
            return f"Deep analysis: Breaking down the problem into logical steps. Key considerations include complexity, requirements, and optimal approach."
        elif member.primary_role == TeamRole.BUILDER:
            return f"Implementation plan: Based on analysis, here's how we build this step by step with concrete actions."
        elif member.primary_role == TeamRole.REVIEWER:
            return f"Quality assessment: Checking for completeness, accuracy, and potential improvements. Looks good with minor suggestions."
        elif member.primary_role == TeamRole.COORDINATOR:
            return f"Team coordination: Ensuring all perspectives are integrated and team is aligned on approach."
        else:
            return f"Specialist insight: Providing domain-specific expertise relevant to this particular challenge."
    
    def get_team_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive team performance report"""
        report = {
            "team_size": len(self.team_members),
            "total_missions": len(self.team_history),
            "successful_missions": sum(1 for m in self.team_history if m.get("success", False)),
            "average_teamwork_quality": 0.0,
            "team_members": {},
            "collaboration_insights": []
        }
        
        if self.team_history:
            total_quality = sum(m.get("teamwork_quality", 0) for m in self.team_history)
            report["average_teamwork_quality"] = total_quality / len(self.team_history)
        
        # Individual member reports
        for name, member in self.team_members.items():
            member_report = {
                "role": member.primary_role.value,
                "backend": member.backend_type,
                "teamwork_effectiveness": member.teamwork_effectiveness,
                "collaboration_score": member.collaboration_score,
                "team_missions": member.team_missions_completed,
                "successful_collaborations": member.successful_collaborations,
                "strengths": member.strengths,
                "contribution_style": self._analyze_contribution_style(member)
            }
            report["team_members"][name] = member_report
        
        # Team insights
        if report["successful_missions"] > 0:
            success_rate = report["successful_missions"] / report["total_missions"]
            if success_rate >= 0.8:
                report["collaboration_insights"].append("Team has excellent collaboration!")
            elif success_rate >= 0.6:
                report["collaboration_insights"].append("Team works well together")
            else:
                report["collaboration_insights"].append("Team could improve collaboration")
        
        return report
    
    def _analyze_contribution_style(self, member: TeamMember) -> str:
        """Analyze how this member contributes to team"""
        if member.teaching_ability > 0.7:
            return "Mentor - helps other team members"
        elif member.learning_from_others > 0.7:
            return "Learner - grows from team input"
        elif member.collaboration_score > 0.8:
            return "Collaborator - works well with others"
        elif member.communication_clarity > 0.8:
            return "Communicator - explains ideas clearly"
        else:
            return "Specialist - contributes domain expertise"

# Global teamwork system
GLOBAL_TEAMWORK_SYSTEM = TeamworkOrchestrator()