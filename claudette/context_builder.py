"""
Context Builder - Builds context for prompt preprocessing
Integrates with structure_manager for intelligent file selection
"""

import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

# Import structure manager from existing codebase
sys.path.append(str(Path(__file__).parent.parent / "core" / "coordination"))
try:
    from structure_manager import StructureManager
except ImportError:
    # Fallback if structure_manager not available
    class StructureManager:
        def suggest_placement(self, file_type: str, description: str = "") -> Dict[str, str]:
            return {"path": ".", "reason": "Default location"}


class ContextBuilder:
    """Builds context information for prompt preprocessing"""
    
    def __init__(self):
        self.structure_manager = StructureManager()
    
    def build_context(self, command: str, args: List[str]) -> Dict[str, Any]:
        """
        Build context for a claudette command
        
        Args:
            command: Command type (edit, commit, new)
            args: Command arguments
            
        Returns:
            Context dictionary with relevant information
        """
        context = {
            "command_type": command,
            "args": args,
            "files": [],
            "summary": ""
        }
        
        if command == "edit" and len(args) > 1:
            # Extract file path from edit command
            file_path = args[1]  # args[0] is 'edit', args[1] is path
            context["files"] = [file_path]
            context["summary"] = f"Editing file: {file_path}"
            
            # Add file context if file exists
            if Path(file_path).exists():
                context["file_info"] = self._get_file_info(file_path)
        
        elif command == "commit":
            # For commits, gather recent changes context
            context["summary"] = "Creating git commit"
            context["files"] = self._get_git_changed_files()
        
        elif command == "new":
            # For new projects, provide project structure context
            context["summary"] = "Creating new project"
            if len(args) > 2:  # Has project name
                project_name = args[2]
                context["project_name"] = project_name
                context["summary"] = f"Creating new project: {project_name}"
        
        return context
    
    def _get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get information about a file"""
        path = Path(file_path)
        
        info = {
            "exists": path.exists(),
            "extension": path.suffix,
            "size": 0
        }
        
        if path.exists():
            try:
                info["size"] = path.stat().st_size
                # Add more file analysis as needed
            except OSError:
                pass
        
        return info
    
    def _get_git_changed_files(self) -> List[str]:
        """Get list of changed files in git repository"""
        import subprocess
        
        try:
            # Get staged files
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                return result.stdout.strip().split('\n') if result.stdout.strip() else []
        except FileNotFoundError:
            pass
        
        return []
    
    def select_top_k(self, files: List[str], k: int = 12) -> List[str]:
        """
        Select top K most relevant files with token awareness
        
        Args:
            files: List of file paths
            k: Number of files to select (default 12)
            
        Returns:
            List of top K files within token limits
        """
        if not files:
            return []
        
        # Rank files by relevance
        ranked_files = self._rank_files_by_relevance(files)
        
        # Select files within token budget
        selected = []
        total_tokens = 0
        token_limit = 1500  # Reserve tokens for other context
        
        for file_path in ranked_files[:k]:
            file_tokens = self._estimate_file_tokens(file_path)
            
            if total_tokens + file_tokens <= token_limit:
                selected.append(file_path)
                total_tokens += file_tokens
            else:
                # Try to include a trimmed version
                if len(selected) < 3:  # Ensure minimum files
                    trimmed_path = self._trim_file_for_tokens(file_path, token_limit - total_tokens)
                    if trimmed_path:
                        selected.append(trimmed_path)
                break
        
        return selected
    
    def _rank_files_by_relevance(self, files: List[str]) -> List[str]:
        """Rank files by relevance score"""
        scored_files = []
        
        for file_path in files:
            score = self._calculate_relevance_score(file_path)
            scored_files.append((score, file_path))
        
        # Sort by score descending
        scored_files.sort(key=lambda x: x[0], reverse=True)
        return [f[1] for f in scored_files]
    
    def _calculate_relevance_score(self, file_path: str) -> float:
        """Calculate relevance score for a file"""
        path = Path(file_path)
        score = 0.0
        
        # File extension scoring
        ext_scores = {
            '.py': 10, '.js': 9, '.ts': 9, '.java': 8, '.cpp': 8, '.c': 8,
            '.md': 5, '.txt': 4, '.json': 6, '.yaml': 6, '.yml': 6,
            '.html': 7, '.css': 6, '.scss': 6, '.sql': 7
        }
        score += ext_scores.get(path.suffix.lower(), 1)
        
        # Size scoring (prefer smaller, manageable files)
        try:
            size = path.stat().st_size
            if size < 1000:
                score += 5
            elif size < 5000:
                score += 3
            elif size < 20000:
                score += 1
            else:
                score -= 2  # Penalize very large files
        except OSError:
            score -= 5  # Penalize missing files
        
        # Path depth (prefer files closer to root)
        depth = len(path.parts)
        score += max(0, 5 - depth)
        
        # Special file names
        name_lower = path.name.lower()
        if any(x in name_lower for x in ['main', 'index', 'app', 'config']):
            score += 3
        if any(x in name_lower for x in ['test', 'spec']):
            score += 2
        if any(x in name_lower for x in ['readme', 'license', 'changelog']):
            score += 1
        
        return score
    
    def _estimate_file_tokens(self, file_path: str) -> int:
        """Estimate token count for a file"""
        try:
            path = Path(file_path)
            if not path.exists():
                return 50  # Placeholder for missing files
            
            size = path.stat().st_size
            if size == 0:
                return 10
            
            # Rough estimation: 1 token per 4 characters
            return min(size // 4, 500)  # Cap individual file contribution
            
        except OSError:
            return 50
    
    def _trim_file_for_tokens(self, file_path: str, available_tokens: int) -> Optional[str]:
        """Return trimmed file path notation if it can fit in available tokens"""
        if available_tokens < 50:
            return None
        
        # For small token budgets, just include the file reference
        path = Path(file_path)
        reference = f"{path.name}[trimmed]"
        
        # Estimate tokens for reference
        ref_tokens = len(reference) // 4
        if ref_tokens <= available_tokens:
            return reference
        
        return None