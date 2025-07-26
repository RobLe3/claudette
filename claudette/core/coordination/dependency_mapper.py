#!/usr/bin/env python3
"""
Dependency Mapper - Analyze and map all dependencies in the project
Provides impact analysis for changes and finds all references to files/modules
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Optional
import json

class DependencyMapper:
    """Map and analyze all dependencies in the Claude Flow project"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('/Users/roble/Documents/Python/claude_flow')
        self.dependency_graph = {}
        self.reverse_dependencies = {}
    
    def analyze_impact(self, target_path: str) -> Dict[str, any]:
        """Analyze the impact of changing a specific file or directory"""
        print(f"🔍 Analyzing impact of changes to: {target_path}")
        
        target = Path(target_path)
        if not target.is_absolute():
            target = self.project_root / target
        
        impact = {
            'target': str(target),
            'direct_references': [],
            'configuration_files': [],
            'documentation_references': [],
            'import_references': [],
            'symlink_references': [],
            'hook_references': [],
            'total_affected_files': 0
        }
        
        # Find all files that reference this target
        all_files = list(self.project_root.rglob("*"))
        
        for file_path in all_files:
            if file_path.is_file() and not file_path.name.startswith('.'):
                refs = self._find_references_in_file(file_path, target)
                if refs:
                    self._categorize_references(file_path, refs, impact)
        
        impact['total_affected_files'] = len(set(
            impact['direct_references'] + 
            impact['configuration_files'] + 
            impact['documentation_references'] + 
            impact['import_references'] + 
            impact['symlink_references'] + 
            impact['hook_references']
        ))
        
        self._print_impact_report(impact)
        return impact
    
    def _find_references_in_file(self, file_path: Path, target: Path) -> List[str]:
        """Find all references to target in a specific file"""
        references = []
        
        try:
            # Handle symlinks
            if file_path.is_symlink():
                link_target = file_path.readlink()
                if target.name in str(link_target) or str(target) in str(link_target):
                    references.append(f"symlink_target: {link_target}")
                return references
            
            # Read file content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Search for various reference patterns
            target_name = target.name
            target_stem = target.stem
            target_path_str = str(target)
            
            patterns = [
                # Direct path references
                re.escape(target_path_str),
                re.escape(str(target.relative_to(self.project_root))),
                
                # File name references
                r'\b' + re.escape(target_name) + r'\b',
                
                # Python import patterns
                r'from\s+[^\s]*' + re.escape(target_stem) + r'[^\s]*\s+import',
                r'import\s+[^\s]*' + re.escape(target_stem),
                
                # Configuration patterns
                r'"[^"]*' + re.escape(target_name) + r'[^"]*"',
                r"'[^']*" + re.escape(target_name) + r"[^']*'",
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    references.extend([f"pattern_match: {pattern}" for _ in matches])
        
        except Exception as e:
            # Skip files that can't be read
            pass
        
        return references
    
    def _categorize_references(self, file_path: Path, references: List[str], impact: Dict[str, any]):
        """Categorize references by file type and reference type"""
        file_str = str(file_path)
        
        # Categorize by file type
        if file_path.name == 'settings.json' or '.claude' in str(file_path):
            impact['configuration_files'].append(file_str)
        elif file_path.suffix == '.md':
            impact['documentation_references'].append(file_str)
        elif file_path.suffix == '.py':
            if any('import' in ref for ref in references):
                impact['import_references'].append(file_str)
            else:
                impact['direct_references'].append(file_str)
        elif 'hook' in file_path.name.lower() or any('hook' in ref for ref in references):
            impact['hook_references'].append(file_str)
        elif any('symlink' in ref for ref in references):
            impact['symlink_references'].append(file_str)
        else:
            impact['direct_references'].append(file_str)
    
    def _print_impact_report(self, impact: Dict[str, any]):
        """Print a formatted impact analysis report"""
        print(f"\n📊 Impact Analysis Report for: {impact['target']}")
        print(f"{'='*60}")
        
        categories = [
            ('Configuration Files', impact['configuration_files']),
            ('Python Import References', impact['import_references']),
            ('Documentation References', impact['documentation_references']),
            ('Hook References', impact['hook_references']),
            ('Symlink References', impact['symlink_references']),
            ('Other Direct References', impact['direct_references'])
        ]
        
        for category_name, files in categories:
            if files:
                print(f"\n🔗 {category_name}: ({len(files)} files)")
                for file_path in files[:5]:  # Show first 5
                    relative_path = str(Path(file_path).relative_to(self.project_root))
                    print(f"   - {relative_path}")
                if len(files) > 5:
                    print(f"   ... and {len(files) - 5} more files")
        
        print(f"\n📈 Summary:")
        print(f"   Total affected files: {impact['total_affected_files']}")
        print(f"   Risk level: {'HIGH' if impact['total_affected_files'] > 10 else 'MEDIUM' if impact['total_affected_files'] > 3 else 'LOW'}")
        
        if impact['configuration_files']:
            print(f"   ⚠️  Configuration updates required!")
        if impact['import_references']:
            print(f"   ⚠️  Python import updates required!")
        if impact['documentation_references']:
            print(f"   ⚠️  Documentation updates required!")
    
    def find_references(self, target: str) -> List[str]:
        """Find all files that reference a specific target"""
        print(f"🔍 Finding all references to: {target}")
        
        target_path = Path(target)
        if not target_path.is_absolute():
            target_path = self.project_root / target
        
        references = []
        all_files = list(self.project_root.rglob("*"))
        
        for file_path in all_files:
            if file_path.is_file() and not file_path.name.startswith('.'):
                refs = self._find_references_in_file(file_path, target_path)
                if refs:
                    references.append(str(file_path))
        
        print(f"📋 Found {len(references)} files referencing {target}:")
        for ref in references:
            relative_path = str(Path(ref).relative_to(self.project_root))
            print(f"   - {relative_path}")
        
        return references
    
    def build_dependency_graph(self) -> Dict[str, any]:
        """Build a complete dependency graph of the project"""
        print("🕸️ Building complete dependency graph...")
        
        graph = {
            'files': {},
            'dependencies': {},
            'reverse_dependencies': {}
        }
        
        # Find all Python files
        python_files = list(self.project_root.rglob("*.py"))
        
        for py_file in python_files:
            file_key = str(py_file.relative_to(self.project_root))
            graph['files'][file_key] = {
                'path': str(py_file),
                'imports': [],
                'referenced_by': []
            }
            
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find import statements
                import_patterns = [
                    r'^from\s+([^\s]+)\s+import',
                    r'^import\s+([^\s,]+)',
                ]
                
                for pattern in import_patterns:
                    matches = re.findall(pattern, content, re.MULTILINE)
                    for match in matches:
                        if 'core.' in match or 'scripts.' in match:
                            graph['files'][file_key]['imports'].append(match)
                            
                            # Add to reverse dependencies
                            if match not in graph['reverse_dependencies']:
                                graph['reverse_dependencies'][match] = []
                            graph['reverse_dependencies'][match].append(file_key)
            
            except Exception:
                pass
        
        return graph
    
    def export_dependency_map(self, output_file: str = "dependency_map.json"):
        """Export dependency analysis to JSON file"""
        graph = self.build_dependency_graph()
        
        output_path = self.project_root / output_file
        with open(output_path, 'w') as f:
            json.dump(graph, f, indent=2)
        
        print(f"📁 Dependency map exported to: {output_path}")
        return output_path

def main():
    """CLI interface for dependency mapping"""
    mapper = DependencyMapper()
    
    if len(sys.argv) < 2:
        print("Dependency Mapper - Analyze and map project dependencies")
        print("\nUsage:")
        print("  python3 dependency_mapper.py --analyze-impact <file_or_directory>")
        print("  python3 dependency_mapper.py --find-references <target>")
        print("  python3 dependency_mapper.py --build-graph")
        print("  python3 dependency_mapper.py --export-map [output_file]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "--analyze-impact":
        if len(sys.argv) < 3:
            print("Usage: --analyze-impact <file_or_directory>")
            sys.exit(1)
        target = sys.argv[2]
        mapper.analyze_impact(target)
    
    elif command == "--find-references":
        if len(sys.argv) < 3:
            print("Usage: --find-references <target>")
            sys.exit(1)
        target = sys.argv[2]
        mapper.find_references(target)
    
    elif command == "--build-graph":
        graph = mapper.build_dependency_graph()
        print(f"📊 Dependency graph built with {len(graph['files'])} files")
    
    elif command == "--export-map":
        output_file = sys.argv[2] if len(sys.argv) > 2 else "dependency_map.json"
        mapper.export_dependency_map(output_file)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()