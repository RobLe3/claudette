"""
Enhanced Help System for Claudette
Provides contextual help, examples, command suggestions, and progressive disclosure
"""

import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import difflib
import subprocess

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.columns import Columns
    from rich.markdown import Markdown
    from rich.tree import Tree
    from rich.syntax import Syntax
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class HelpSystem:
    """Enhanced help system with examples, suggestions, and contextual guidance"""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
        self.commands = self._initialize_commands()
        self.examples = self._initialize_examples()
        self.troubleshooting = self._initialize_troubleshooting()
    
    def show_help(self, command: Optional[str] = None, show_examples: bool = True, 
                  show_advanced: bool = False) -> str:
        """
        Show enhanced help with progressive disclosure
        
        Args:
            command: Specific command to show help for
            show_examples: Whether to include examples
            show_advanced: Whether to show advanced options
            
        Returns:
            Help text string
        """
        if command:
            return self._show_command_help(command, show_examples, show_advanced)
        else:
            return self._show_overview_help(show_examples, show_advanced)
    
    def suggest_command(self, user_input: str) -> List[Tuple[str, float]]:
        """
        Suggest commands based on user input using fuzzy matching
        
        Args:
            user_input: User's input that may contain typos
            
        Returns:
            List of (command, similarity_score) tuples
        """
        suggestions = []
        all_commands = list(self.commands.keys()) + ['help', 'version', 'setup']
        
        for command in all_commands:
            # Calculate similarity
            similarity = difflib.SequenceMatcher(None, user_input.lower(), command.lower()).ratio()
            if similarity > 0.3:  # Threshold for suggestions
                suggestions.append((command, similarity))
        
        # Sort by similarity score
        suggestions.sort(key=lambda x: x[1], reverse=True)
        return suggestions[:5]  # Return top 5 suggestions
    
    def show_command_suggestion(self, user_input: str) -> bool:
        """
        Show command suggestions for potentially misspelled commands
        
        Args:
            user_input: User's input
            
        Returns:
            True if suggestions were shown, False otherwise
        """
        suggestions = self.suggest_command(user_input)
        
        if not suggestions:
            return False
        
        if self.console:
            self.console.print(f"[yellow]❓ Unknown command: '{user_input}'[/yellow]")
            self.console.print("\n[cyan]💡 Did you mean:[/cyan]")
            
            for command, score in suggestions:
                confidence = "🎯" if score > 0.7 else "🤔" if score > 0.5 else "💭"
                self.console.print(f"  {confidence} [bold]{command}[/bold] ({score:.0%} match)")
                
                # Show quick description
                if command in self.commands:
                    self.console.print(f"     {self.commands[command]['description']}")
            
            self.console.print(f"\n[dim]Use 'claudette help {suggestions[0][0]}' for more information[/dim]")
        else:
            print(f"❓ Unknown command: '{user_input}'")
            print("\n💡 Did you mean:")
            for command, score in suggestions:
                print(f"  • {command} ({score:.0%} match)")
                if command in self.commands:
                    print(f"    {self.commands[command]['description']}")
        
        return True
    
    def show_contextual_help(self, context: Dict[str, Any]) -> str:
        """
        Show contextual help based on current situation
        
        Args:
            context: Context information (current directory, git status, etc.)
            
        Returns:
            Contextual help text
        """
        help_sections = []
        
        # Check if in git repository
        if context.get('is_git_repo', False):
            help_sections.append(self._get_git_help())
        
        # Check file types in current directory
        if context.get('has_python_files', False):
            help_sections.append(self._get_python_help())
        
        if context.get('has_js_files', False):
            help_sections.append(self._get_javascript_help())
        
        # Check if first time user
        if not Path.home().joinpath('.claudette').exists():
            help_sections.append(self._get_first_time_help())
        
        if self.console and help_sections:
            self.console.print(Panel(
                "\n\n".join(help_sections),
                title="[cyan]💡 Contextual Suggestions[/cyan]",
                border_style="cyan"
            ))
            return "\n".join(help_sections)
        elif help_sections:
            result = "💡 Contextual Suggestions:\n" + "\n".join(help_sections)
            print(result)
            return result
        
        return ""
    
    def show_getting_started(self):
        """Show comprehensive getting started guide"""
        if self.console:
            self._show_rich_getting_started()
        else:
            self._show_plain_getting_started()
    
    def _show_rich_getting_started(self):
        """Show getting started guide with Rich formatting"""
        # Welcome panel
        welcome = Panel(
            "[bold cyan]🚀 Welcome to Claudette![/bold cyan]\n\n"
            "Claudette is a Claude Code compatible CLI that enhances your workflow\n"
            "with preprocessing, caching, and multi-backend support.",
            title="Getting Started",
            border_style="cyan"
        )
        self.console.print(welcome)
        
        # Quick setup
        setup_content = """
**🛠️ Quick Setup (2 minutes)**

1. **Auto Setup**: `claudette setup`
   • Detects your environment automatically
   • Configures optimal settings
   • No manual configuration needed!

2. **First Command**: Try editing a file
   ```bash
   claudette edit README.md "Add a project description"
   ```

3. **Check Status**: See your configuration
   ```bash
   claudette status
   ```
        """
        
        self.console.print(Panel(
            Markdown(setup_content),
            title="[green]Quick Start[/green]",
            border_style="green"
        ))
        
        # Common commands table
        commands_table = Table(title="Most Used Commands", show_header=True)
        commands_table.add_column("Command", style="cyan", width=25)
        commands_table.add_column("Description", style="white")
        commands_table.add_column("Example", style="dim")
        
        common_commands = [
            ("edit", "Edit files with AI", "claudette edit app.py 'add error handling'"),
            ("commit", "Generate commit messages", "claudette commit"),
            ("ask", "Ask questions about code", "claudette ask 'explain this function'"),
            ("chat", "Interactive chat mode", "claudette chat"),
            ("dashboard", "View cost analytics", "claudette dashboard"),
        ]
        
        for cmd, desc, example in common_commands:
            commands_table.add_row(cmd, desc, example)
        
        self.console.print(commands_table)
        
        # Tips panel
        tips = """
**💡 Pro Tips**

• Use `claudette help [command]` for detailed help on any command
• Run `claudette setup` if you encounter configuration issues  
• Check `claudette dashboard` to monitor your usage and costs
• Use `claudette --help` to see all available options
        """
        
        self.console.print(Panel(
            Markdown(tips),
            title="[yellow]Tips & Tricks[/yellow]",
            border_style="yellow"
        ))
    
    def _show_plain_getting_started(self):
        """Show getting started guide in plain text"""
        print("🚀 Welcome to Claudette!")
        print("=" * 50)
        print()
        
        print("🛠️  Quick Setup (2 minutes):")
        print("1. Auto Setup: claudette setup")
        print("2. First Command: claudette edit README.md 'Add description'")
        print("3. Check Status: claudette status")
        print()
        
        print("📚 Common Commands:")
        print("• edit    - Edit files with AI")
        print("• commit  - Generate commit messages")
        print("• ask     - Ask questions about code")
        print("• chat    - Interactive chat mode") 
        print("• dashboard - View cost analytics")
        print()
        
        print("💡 Pro Tips:")
        print("• Use 'claudette help [command]' for detailed help")
        print("• Run 'claudette setup' if you have issues")
        print("• Check 'claudette dashboard' for usage stats")
    
    def _show_overview_help(self, show_examples: bool, show_advanced: bool) -> str:
        """Show overview help with progressive disclosure"""
        if self.console:
            return self._show_rich_overview(show_examples, show_advanced)
        else:
            return self._show_plain_overview(show_examples, show_advanced)
    
    def _show_rich_overview(self, show_examples: bool, show_advanced: bool) -> str:
        """Show rich formatted overview help"""
        # Header
        header = Panel(
            "[bold cyan]Claudette[/bold cyan] - Claude Code Compatible CLI\n\n"
            "Enhanced with preprocessing, multi-backend support, and cost analytics",
            border_style="cyan"
        )
        self.console.print(header)
        
        # Usage
        usage_panel = Panel(
            "[bold]Usage:[/bold] claudette [OPTIONS] COMMAND [ARGS]...\n\n"
            "[dim]claudette edit file.py \"add error handling\"\n"
            "claudette commit\n"
            "claudette ask \"explain this code\"[/dim]",
            title="Usage",
            border_style="blue"
        )
        self.console.print(usage_panel)
        
        # Commands table
        commands_table = Table(title="Available Commands", show_header=True)
        commands_table.add_column("Command", style="cyan", width=15)
        commands_table.add_column("Description", style="white")
        
        basic_commands = {
            'edit': 'Edit files with AI assistance',
            'commit': 'Generate git commit messages',
            'ask': 'Ask questions about your code',
            'chat': 'Interactive chat session',
            'new': 'Create new files or projects'
        }
        
        for cmd, desc in basic_commands.items():
            commands_table.add_row(cmd, desc)
        
        if show_advanced:
            advanced_commands = {
                'dashboard': 'Cost and usage analytics',
                'status': 'Show configuration and health',
                'setup': 'Interactive setup wizard',
                'history': 'View request history',
                'cache': 'Manage cache operations'
            }
            
            commands_table.add_section()
            for cmd, desc in advanced_commands.items():
                commands_table.add_row(f"[dim]{cmd}[/dim]", f"[dim]{desc}[/dim]")
        else:
            commands_table.add_row("[dim]...[/dim]", "[dim]Use --advanced for more commands[/dim]")
        
        self.console.print(commands_table)
        
        # Options
        if show_advanced:
            options_content = """
**Global Options:**
• `--backend BACKEND` - Force specific backend (claude, openai, ollama)
• `--verbose` - Show detailed output
• `--config PATH` - Use custom config file
• `--help` - Show help message
• `--version` - Show version information

**Environment Variables:**
• `OPENAI_API_KEY` - OpenAI API key
• `ANTHROPIC_API_KEY` - Anthropic API key  
• `MISTRAL_API_KEY` - Mistral API key
• `CLAUDETTE_CONFIG` - Custom config file path
            """
            
            self.console.print(Panel(
                Markdown(options_content),
                title="[magenta]Options & Environment[/magenta]",
                border_style="magenta"
            ))
        
        # Examples
        if show_examples:
            examples_content = self._get_examples_content()
            self.console.print(Panel(
                Markdown(examples_content),
                title="[green]Examples[/green]",
                border_style="green"
            ))
        
        # Footer
        footer = """
**Getting Help:**
• `claudette help COMMAND` - Help for specific command
• `claudette setup` - Interactive configuration
• `claudette status` - Check system health

**First time?** Run `claudette setup` to get started!
        """
        
        self.console.print(Panel(
            Markdown(footer),
            border_style="dim"
        ))
        
        return "Help displayed with Rich formatting"
    
    def _show_plain_overview(self, show_examples: bool, show_advanced: bool) -> str:
        """Show plain text overview help"""
        help_text = []
        
        help_text.extend([
            "Claudette - Claude Code Compatible CLI",
            "Enhanced with preprocessing, multi-backend support, and cost analytics",
            "",
            "Usage: claudette [OPTIONS] COMMAND [ARGS]...",
            "",
            "Commands:",
        ])
        
        basic_commands = {
            'edit': 'Edit files with AI assistance',
            'commit': 'Generate git commit messages',
            'ask': 'Ask questions about your code', 
            'chat': 'Interactive chat session',
            'new': 'Create new files or projects'
        }
        
        for cmd, desc in basic_commands.items():
            help_text.append(f"  {cmd:<12} {desc}")
        
        if show_advanced:
            advanced_commands = {
                'dashboard': 'Cost and usage analytics',
                'status': 'Show configuration and health',
                'setup': 'Interactive setup wizard',
                'history': 'View request history',
                'cache': 'Manage cache operations'
            }
            
            help_text.append("")
            help_text.append("Advanced Commands:")
            for cmd, desc in advanced_commands.items():
                help_text.append(f"  {cmd:<12} {desc}")
        
        if show_examples:
            help_text.extend([
                "",
                "Examples:",
                "  claudette edit app.py 'add error handling'",
                "  claudette commit",
                "  claudette ask 'explain this function'",
                "  claudette dashboard terminal",
                "  claudette setup",
            ])
        
        help_text.extend([
            "",
            "Getting Help:",
            "  claudette help COMMAND    Help for specific command",
            "  claudette setup           Interactive configuration",
            "  claudette status          Check system health",
            "",
            "First time? Run 'claudette setup' to get started!"
        ])
        
        result = "\n".join(help_text)
        print(result)
        return result
    
    def _show_command_help(self, command: str, show_examples: bool, show_advanced: bool) -> str:
        """Show detailed help for specific command"""
        if command not in self.commands:
            # Try to suggest similar commands
            if not self.show_command_suggestion(command):
                error_msg = f"Unknown command: {command}"
                if self.console:
                    self.console.print(f"[red]❌ {error_msg}[/red]")
                else:
                    print(f"❌ {error_msg}")
            return ""
        
        cmd_info = self.commands[command]
        
        if self.console:
            return self._show_rich_command_help(command, cmd_info, show_examples, show_advanced)
        else:
            return self._show_plain_command_help(command, cmd_info, show_examples, show_advanced)
    
    def _show_rich_command_help(self, command: str, cmd_info: Dict[str, Any], 
                               show_examples: bool, show_advanced: bool) -> str:
        """Show rich formatted command help"""
        # Header
        header = Panel(
            f"[bold cyan]claudette {command}[/bold cyan]\n\n{cmd_info['description']}",
            border_style="cyan"
        )
        self.console.print(header)
        
        # Usage
        usage_text = f"[bold]Usage:[/bold] claudette {command}"
        if cmd_info.get('args'):
            usage_text += f" {cmd_info['args']}"
        if cmd_info.get('options'):
            usage_text += " [OPTIONS]"
        
        self.console.print(Panel(usage_text, border_style="blue"))
        
        # Options table
        if cmd_info.get('options'):
            options_table = Table(title="Options", show_header=True)
            options_table.add_column("Option", style="cyan")
            options_table.add_column("Description", style="white")
            options_table.add_column("Default", style="dim")
            
            for option, details in cmd_info['options'].items():
                default_val = details.get('default', '')
                if isinstance(default_val, bool):
                    default_val = 'false' if not default_val else 'true'
                
                options_table.add_row(
                    option,
                    details['description'],
                    str(default_val)
                )
            
            self.console.print(options_table)
        
        # Examples
        if show_examples and cmd_info.get('examples'):
            examples_content = "**Examples:**\n\n"
            for example in cmd_info['examples']:
                examples_content += f"```bash\n{example['command']}\n```\n"
                examples_content += f"{example['description']}\n\n"
            
            self.console.print(Panel(
                Markdown(examples_content),
                title="[green]Examples[/green]",
                border_style="green"
            ))
        
        # Advanced usage
        if show_advanced and cmd_info.get('advanced'):
            advanced_content = "**Advanced Usage:**\n\n"
            advanced_content += cmd_info['advanced']
            
            self.console.print(Panel(
                Markdown(advanced_content),
                title="[magenta]Advanced[/magenta]",
                border_style="magenta"
            ))
        
        return f"Help for {command} displayed"
    
    def _show_plain_command_help(self, command: str, cmd_info: Dict[str, Any],
                                show_examples: bool, show_advanced: bool) -> str:
        """Show plain text command help"""
        help_lines = [
            f"claudette {command}",
            "=" * (len(command) + 10),
            "",
            cmd_info['description'],
            "",
            f"Usage: claudette {command}"
        ]
        
        if cmd_info.get('args'):
            help_lines[-1] += f" {cmd_info['args']}"
        if cmd_info.get('options'):
            help_lines[-1] += " [OPTIONS]"
        
        if cmd_info.get('options'):
            help_lines.extend(["", "Options:"])
            for option, details in cmd_info['options'].items():
                help_lines.append(f"  {option:<20} {details['description']}")
        
        if show_examples and cmd_info.get('examples'):
            help_lines.extend(["", "Examples:"])
            for example in cmd_info['examples']:
                help_lines.append(f"  {example['command']}")
                help_lines.append(f"    {example['description']}")
                help_lines.append("")
        
        if show_advanced and cmd_info.get('advanced'):
            help_lines.extend(["", "Advanced Usage:", cmd_info['advanced']])
        
        result = "\n".join(help_lines)
        print(result)
        return result
    
    def _initialize_commands(self) -> Dict[str, Dict[str, Any]]:
        """Initialize command information database"""
        return {
            'edit': {
                'description': 'Edit files with AI assistance using intelligent preprocessing',
                'args': 'FILE [MESSAGE]',
                'options': {
                    '--backend BACKEND': {'description': 'Force specific backend', 'default': 'auto'},
                    '--dry-run': {'description': 'Show changes without applying', 'default': False},
                    '--verbose': {'description': 'Show detailed processing', 'default': False}
                },
                'examples': [
                    {
                        'command': 'claudette edit app.py "add error handling"',
                        'description': 'Add error handling to app.py'
                    },
                    {
                        'command': 'claudette edit src/ "refactor for better performance"',
                        'description': 'Refactor entire src directory'
                    },
                    {
                        'command': 'claudette edit --backend openai file.py "optimize"',
                        'description': 'Use OpenAI backend specifically'
                    }
                ],
                'advanced': 'Supports context-aware editing, multi-file operations, and automatic backup creation.'
            },
            'commit': {
                'description': 'Generate intelligent git commit messages from staged changes',
                'args': '[MESSAGE]',
                'options': {
                    '--all': {'description': 'Stage all changes before committing', 'default': False},
                    '--push': {'description': 'Push after committing', 'default': False},
                    '--type TYPE': {'description': 'Commit type (feat, fix, docs, etc.)', 'default': 'auto'}
                },
                'examples': [
                    {
                        'command': 'claudette commit',
                        'description': 'Generate commit message from staged changes'
                    },
                    {
                        'command': 'claudette commit --all --push',
                        'description': 'Stage all, commit, and push'
                    },
                    {
                        'command': 'claudette commit "custom message"',
                        'description': 'Use custom commit message'
                    }
                ],
                'advanced': 'Analyzes diff patterns, follows conventional commit format, and integrates with git hooks.'
            },
            'ask': {
                'description': 'Ask questions about your codebase with context awareness',
                'args': 'QUESTION [FILES...]',
                'options': {
                    '--context PATH': {'description': 'Additional context directory', 'default': '.'},
                    '--format FORMAT': {'description': 'Output format (text, markdown, json)', 'default': 'text'}
                },
                'examples': [
                    {
                        'command': 'claudette ask "how does authentication work?"',
                        'description': 'Ask about authentication in current project'
                    },
                    {
                        'command': 'claudette ask "explain this function" src/utils.py',
                        'description': 'Ask about specific file'
                    }
                ],
                'advanced': 'Uses project context, code analysis, and intelligent file discovery.'
            },
            'chat': {
                'description': 'Start interactive chat session with project context',
                'options': {
                    '--backend BACKEND': {'description': 'Preferred backend', 'default': 'auto'},
                    '--save-session': {'description': 'Save chat history', 'default': True}
                },
                'examples': [
                    {
                        'command': 'claudette chat',
                        'description': 'Start interactive session'
                    }
                ],
                'advanced': 'Maintains conversation context, project awareness, and session persistence.'
            }
        }
    
    def _initialize_examples(self) -> Dict[str, List[Dict[str, str]]]:
        """Initialize examples database"""
        return {
            'getting_started': [
                {
                    'title': 'First Setup',
                    'commands': ['claudette setup', 'claudette status'],
                    'description': 'Configure claudette for your environment'
                }
            ],
            'daily_workflow': [
                {
                    'title': 'Code Development',
                    'commands': [
                        'claudette edit app.py "add input validation"',
                        'claudette ask "are there any security issues?"',
                        'claudette commit'
                    ],
                    'description': 'Typical development workflow'
                }
            ]
        }
    
    def _initialize_troubleshooting(self) -> Dict[str, Dict[str, Any]]:
        """Initialize troubleshooting database"""
        return {
            'setup_issues': {
                'title': 'Setup and Configuration Issues',
                'problems': [
                    {
                        'issue': 'Claude CLI not found',
                        'solution': 'Install with: npm install -g @anthropic-ai/claude-cli'
                    },
                    {
                        'issue': 'API key not working',
                        'solution': 'Set environment variable: export OPENAI_API_KEY="your-key"'
                    }
                ]
            }
        }
    
    def _get_examples_content(self) -> str:
        """Get examples content for display"""
        return """
**📝 Common Tasks**

Edit files:
```bash
claudette edit app.py "add error handling"
claudette edit src/ "refactor for performance"
```

Git workflow:
```bash
claudette commit                    # Generate commit message  
claudette commit --all --push      # Stage, commit, and push
```

Ask questions:
```bash
claudette ask "how does auth work?"
claudette ask "explain this function" utils.py
```

Analytics:
```bash
claudette dashboard terminal        # Terminal dashboard
claudette dashboard web            # Web dashboard
```
        """
    
    def _get_git_help(self) -> str:
        """Get git-specific help"""
        return """
**🔀 Git Repository Detected**
• Use `claudette commit` to generate smart commit messages
• Try `claudette ask "what changed since last commit?"`
• Use `claudette edit` with git context for better suggestions
        """
    
    def _get_python_help(self) -> str:
        """Get Python-specific help"""
        return """
**🐍 Python Project Detected**
• Use `claudette edit *.py "add type hints"`
• Ask about code: `claudette ask "explain this class"`  
• Check for issues: `claudette ask "any potential bugs?"`
        """
    
    def _get_javascript_help(self) -> str:
        """Get JavaScript-specific help"""
        return """
**📜 JavaScript Project Detected**
• Modernize code: `claudette edit *.js "convert to ES6"`
• Add tests: `claudette edit "add unit tests"`
• Performance check: `claudette ask "any performance issues?"`
        """
    
    def _get_first_time_help(self) -> str:
        """Get first-time user help"""
        return """
**👋 First Time Using Claudette?**
• Run `claudette setup` for automatic configuration
• Try `claudette edit README.md "improve documentation"`
• Check `claudette status` to verify everything works
        """


def show_help(command: Optional[str] = None, show_examples: bool = True, 
              show_advanced: bool = False) -> str:
    """
    Show enhanced help with contextual information
    
    Args:
        command: Specific command to show help for
        show_examples: Whether to include examples
        show_advanced: Whether to show advanced options
        
    Returns:
        Help text
    """
    help_system = HelpSystem()
    return help_system.show_help(command, show_examples, show_advanced)


def suggest_command(user_input: str) -> List[Tuple[str, float]]:
    """
    Suggest commands for potentially misspelled input
    
    Args:
        user_input: User's input
        
    Returns:
        List of (command, similarity) tuples
    """
    help_system = HelpSystem()
    return help_system.suggest_command(user_input)


def show_command_suggestion(user_input: str) -> bool:
    """
    Show command suggestions with descriptions
    
    Args:
        user_input: User's input
        
    Returns:
        True if suggestions were shown
    """
    help_system = HelpSystem()
    return help_system.show_command_suggestion(user_input)


def show_getting_started():
    """Show comprehensive getting started guide"""
    help_system = HelpSystem()
    help_system.show_getting_started()


def detect_context() -> Dict[str, Any]:
    """Detect context for contextual help"""
    cwd = Path.cwd()
    
    context = {
        'is_git_repo': (cwd / '.git').exists(),
        'has_python_files': len(list(cwd.glob('*.py'))) > 0,
        'has_js_files': len(list(cwd.glob('*.js'))) > 0,
        'has_package_json': (cwd / 'package.json').exists(),
        'has_requirements': (cwd / 'requirements.txt').exists(),
        'current_dir': str(cwd)
    }
    
    return context


def show_contextual_help() -> str:
    """Show help based on current context"""
    help_system = HelpSystem()
    context = detect_context()
    return help_system.show_contextual_help(context)


if __name__ == '__main__':
    # Test help system
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('command', nargs='?', help='Command to get help for')
    parser.add_argument('--examples', action='store_true', help='Show examples')
    parser.add_argument('--advanced', action='store_true', help='Show advanced options')
    parser.add_argument('--suggest', help='Test command suggestion')
    parser.add_argument('--contextual', action='store_true', help='Show contextual help')
    
    args = parser.parse_args()
    
    if args.suggest:
        suggestions = suggest_command(args.suggest)
        print(f"Suggestions for '{args.suggest}':")
        for cmd, score in suggestions:
            print(f"  {cmd} ({score:.1%})")
    elif args.contextual:
        show_contextual_help()
    else:
        show_help(args.command, args.examples, args.advanced)