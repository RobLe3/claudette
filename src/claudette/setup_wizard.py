"""
Interactive Setup Wizard for Claudette
Zero-configuration first-run experience with auto-detection and smart defaults
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import json

try:
    from rich.console import Console
    from rich.prompt import Prompt, Confirm, IntPrompt
    from rich.panel import Panel
    from rich.table import Table
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.markdown import Markdown
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from .config import Config


class SetupWizard:
    """Interactive setup wizard with auto-detection and smart defaults"""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
        self.config_data = {}
        self.detected_env = {}
        self.setup_complete = False
    
    def run(self, force_interactive: bool = False) -> Dict[str, Any]:
        """
        Run the setup wizard
        
        Args:
            force_interactive: Force interactive mode even if auto-setup is possible
            
        Returns:
            Dictionary of configuration settings
        """
        if self.console:
            self.console.print(Panel(
                "[bold cyan]🚀 Welcome to Claudette![/bold cyan]\n\n"
                "Let's get you set up with the best configuration for your environment.\n"
                "This will only take a minute!",
                title="Setup Wizard",
                border_style="cyan"
            ))
        else:
            print("🚀 Welcome to Claudette Setup!")
            print("Let's configure your environment...")
        
        # Step 1: Detect environment
        self._detect_environment()
        
        # Step 2: Check if we can auto-setup
        if not force_interactive and self._can_auto_setup():
            return self._run_auto_setup()
        
        # Step 3: Interactive setup
        return self._run_interactive_setup()
    
    def _detect_environment(self):
        """Auto-detect available tools, keys, and configuration"""
        self.detected_env = {
            'claude_cli': self._detect_claude_cli(),
            'api_keys': self._detect_api_keys(),
            'ollama': self._detect_ollama(),
            'python_version': sys.version,
            'platform': sys.platform,
            'has_git': shutil.which('git') is not None,
            'home_dir': str(Path.home()),
            'current_dir': str(Path.cwd())
        }
        
        if self.console:
            self.console.print("[dim]🔍 Environment detected successfully[/dim]")
    
    def _detect_claude_cli(self) -> Dict[str, Any]:
        """Detect Claude CLI installation and configuration"""
        result = {
            'installed': False,
            'path': None,
            'version': None,
            'working': False
        }
        
        # Common Claude CLI locations
        claude_paths = ['claude', 'npx claude', '~/.local/bin/claude']
        
        for cmd in claude_paths:
            try:
                if cmd.startswith('~'):
                    cmd = os.path.expanduser(cmd)
                
                proc = subprocess.run(
                    cmd.split() + ['--version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if proc.returncode == 0:
                    result['installed'] = True
                    result['path'] = cmd
                    result['version'] = proc.stdout.strip()
                    result['working'] = True
                    break
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
                continue
        
        return result
    
    def _detect_api_keys(self) -> Dict[str, Optional[str]]:
        """Detect available API keys from environment"""
        keys = {
            'openai': os.getenv('OPENAI_API_KEY'),
            'anthropic': os.getenv('ANTHROPIC_API_KEY'),
            'mistral': os.getenv('MISTRAL_API_KEY'),
            'claude': os.getenv('CLAUDE_API_KEY')
        }
        
        # Check for partial keys (for display purposes)
        detected_keys = {}
        for provider, key in keys.items():
            if key:
                detected_keys[provider] = f"***{key[-4:]}" if len(key) > 4 else "***"
            else:
                detected_keys[provider] = None
        
        return detected_keys
    
    def _detect_ollama(self) -> Dict[str, Any]:
        """Detect Ollama installation and available models"""
        result = {
            'installed': False,
            'running': False,
            'models': [],
            'url': 'http://localhost:11434'
        }
        
        try:
            # Check if ollama command exists
            proc = subprocess.run(['ollama', '--version'], capture_output=True, timeout=3)
            if proc.returncode == 0:
                result['installed'] = True
                
                # Check if service is running and get models
                try:
                    proc = subprocess.run(
                        ['ollama', 'list'], 
                        capture_output=True, 
                        text=True, 
                        timeout=5
                    )
                    if proc.returncode == 0:
                        result['running'] = True
                        # Parse model list
                        lines = proc.stdout.strip().split('\n')[1:]  # Skip header
                        result['models'] = [line.split()[0] for line in lines if line.strip()]
                
                except Exception:
                    pass
                    
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
            pass
        
        return result
    
    def _can_auto_setup(self) -> bool:
        """Check if we can automatically configure without user input"""
        # We can auto-setup if:
        # 1. Claude CLI is working, OR
        # 2. We have at least one API key available
        
        has_claude = self.detected_env['claude_cli']['working']
        has_api_keys = any(key for key in self.detected_env['api_keys'].values())
        
        return has_claude or has_api_keys
    
    def _run_auto_setup(self) -> Dict[str, Any]:
        """Run automatic setup with smart defaults"""
        if self.console:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console,
            ) as progress:
                task = progress.add_task("[cyan]Auto-configuring...", total=None)
                self._generate_auto_config()
                progress.update(task, description="[green]✓ Configuration complete!")
        else:
            print("⚡ Auto-configuring with detected settings...")
            self._generate_auto_config()
            print("✓ Configuration complete!")
        
        return self.config_data
    
    def _generate_auto_config(self):
        """Generate optimal configuration from detected environment"""
        # Start with smart defaults
        self.config_data = {
            'claude_cmd': 'claude',
            'default_backend': 'auto',
            'cache_dir': '~/.claudette/cache',
            'history_enabled': True,
            'fallback_enabled': True
        }
        
        # Configure Claude CLI
        if self.detected_env['claude_cli']['working']:
            self.config_data['claude_cmd'] = self.detected_env['claude_cli']['path']
        
        # Configure API backends based on available keys
        api_keys = self.detected_env['api_keys']
        
        if api_keys.get('openai'):
            self.config_data['openai_model'] = 'gpt-3.5-turbo'
            # Don't store the key in config - use env var
            
        if api_keys.get('mistral'):
            self.config_data['mistral_model'] = 'mistral-tiny'
            
        # Configure Ollama if available
        if self.detected_env['ollama']['running']:
            available_models = self.detected_env['ollama']['models']
            if available_models:
                # Use first available model, or prefer llama2/mistral if available
                preferred_models = ['llama2', 'mistral', 'codellama']
                selected_model = None
                
                for model in preferred_models:
                    if any(model in available.lower() for available in available_models):
                        selected_model = next(m for m in available_models if model in m.lower())
                        break
                
                self.config_data['ollama_model'] = selected_model or available_models[0]
                self.config_data['ollama_url'] = self.detected_env['ollama']['url']
        
        # Set optimal default backend
        if self.detected_env['claude_cli']['working']:
            self.config_data['default_backend'] = 'claude'
        elif api_keys.get('openai'):
            self.config_data['default_backend'] = 'openai' 
        elif self.detected_env['ollama']['running']:
            self.config_data['default_backend'] = 'ollama'
    
    def _run_interactive_setup(self) -> Dict[str, Any]:
        """Run interactive setup wizard"""
        if self.console:
            self.console.print("\n[bold]Let's configure Claudette step by step...[/bold]\n")
        else:
            print("\nLet's configure Claudette step by step...\n")
        
        # Step 1: Claude CLI Configuration
        self._configure_claude_cli()
        
        # Step 2: Backend Configuration
        self._configure_backends()
        
        # Step 3: Advanced Options
        if self._ask_yes_no("Configure advanced options?", default=False):
            self._configure_advanced_options()
        else:
            self._set_default_advanced_options()
        
        # Step 4: Summary and Save
        self._show_configuration_summary()
        
        return self.config_data
    
    def _configure_claude_cli(self):
        """Configure Claude CLI settings"""
        if self.console:
            self.console.print(Panel(
                "[bold]Step 1: Claude CLI Configuration[/bold]",
                border_style="blue"
            ))
        else:
            print("=== Step 1: Claude CLI Configuration ===")
        
        claude_info = self.detected_env['claude_cli']
        
        if claude_info['working']:
            if self.console:
                self.console.print(f"[green]✓[/green] Claude CLI detected: {claude_info['path']}")
            else:
                print(f"✓ Claude CLI detected: {claude_info['path']}")
            
            self.config_data['claude_cmd'] = claude_info['path']
        else:
            if self.console:
                self.console.print("[yellow]⚠[/yellow] Claude CLI not detected")
            else:
                print("⚠ Claude CLI not detected")
            
            custom_path = self._ask_string(
                "Enter Claude CLI command (or 'skip' to use fallback backends only)",
                default='claude'
            )
            
            if custom_path.lower() != 'skip':
                self.config_data['claude_cmd'] = custom_path
            else:
                self.config_data['claude_cmd'] = None
    
    def _configure_backends(self):
        """Configure fallback backends"""
        if self.console:
            self.console.print(Panel(
                "[bold]Step 2: Fallback Backend Configuration[/bold]",
                border_style="green"
            ))
        else:
            print("\n=== Step 2: Fallback Backend Configuration ===")
        
        # Show detected API keys
        api_keys = self.detected_env['api_keys']
        available_backends = []
        
        if api_keys.get('openai'):
            available_backends.append('openai')
            if self.console:
                self.console.print(f"[green]✓[/green] OpenAI API key detected")
            else:
                print("✓ OpenAI API key detected")
        
        if api_keys.get('mistral'):
            available_backends.append('mistral')
            if self.console:
                self.console.print(f"[green]✓[/green] Mistral API key detected")
            else:
                print("✓ Mistral API key detected")
        
        # Ollama configuration
        ollama_info = self.detected_env['ollama']
        if ollama_info['running']:
            available_backends.append('ollama')
            if self.console:
                self.console.print(f"[green]✓[/green] Ollama running with {len(ollama_info['models'])} models")
            else:
                print(f"✓ Ollama running with {len(ollama_info['models'])} models")
        
        # Set default backend
        if available_backends:
            default_backend_options = ['auto'] + available_backends
            if self.config_data.get('claude_cmd'):
                default_backend_options.insert(1, 'claude')
            
            backend_choice = self._ask_choice(
                "Choose default backend",
                default_backend_options,
                default='auto'
            )
            self.config_data['default_backend'] = backend_choice
        else:
            if self.console:
                self.console.print("[yellow]⚠[/yellow] No API keys detected. Using Claude CLI only.")
            else:
                print("⚠ No API keys detected. Using Claude CLI only.")
            self.config_data['default_backend'] = 'claude'
        
        # Configure specific backend settings
        if 'openai' in available_backends:
            model = self._ask_choice(
                "OpenAI model",
                ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
                default='gpt-3.5-turbo'
            )
            self.config_data['openai_model'] = model
        
        if 'ollama' in available_backends and ollama_info['models']:
            model = self._ask_choice(
                "Ollama model",
                ollama_info['models'],
                default=ollama_info['models'][0]
            )
            self.config_data['ollama_model'] = model
            self.config_data['ollama_url'] = ollama_info['url']
    
    def _configure_advanced_options(self):
        """Configure advanced options"""
        if self.console:
            self.console.print(Panel(
                "[bold]Step 3: Advanced Options[/bold]",
                border_style="magenta"
            ))
        else:
            print("\n=== Step 3: Advanced Options ===")
        
        # Cache configuration
        cache_dir = self._ask_string(
            "Cache directory",
            default='~/.claudette/cache'
        )
        self.config_data['cache_dir'] = cache_dir
        
        # History and fallback options
        self.config_data['history_enabled'] = self._ask_yes_no(
            "Enable request history?", default=True
        )
        self.config_data['fallback_enabled'] = self._ask_yes_no(
            "Enable automatic fallback between backends?", default=True
        )
    
    def _set_default_advanced_options(self):
        """Set smart defaults for advanced options"""
        self.config_data.update({
            'cache_dir': '~/.claudette/cache',
            'history_enabled': True,
            'fallback_enabled': True
        })
    
    def _show_configuration_summary(self):
        """Show configuration summary before saving"""
        if self.console:
            self.console.print(Panel(
                "[bold]Configuration Summary[/bold]",
                border_style="cyan"
            ))
            
            table = Table(show_header=True, header_style="bold cyan")
            table.add_column("Setting", style="white")
            table.add_column("Value", style="green")
            
            for key, value in self.config_data.items():
                display_value = str(value) if value is not None else "[dim]Not set[/dim]"
                table.add_row(key.replace('_', ' ').title(), display_value)
            
            self.console.print(table)
        else:
            print("\n=== Configuration Summary ===")
            for key, value in self.config_data.items():
                print(f"{key.replace('_', ' ').title()}: {value}")
    
    def save_config(self, config_path: Optional[Path] = None) -> Path:
        """Save configuration to file"""
        if config_path is None:
            # Save to project directory if in git repo, otherwise home directory
            if self.detected_env['has_git']:
                config_path = Path.cwd() / 'config.yaml'
            else:
                config_dir = Path.home() / '.claudette'
                config_dir.mkdir(exist_ok=True)
                config_path = config_dir / 'config.yaml'
        
        # Generate YAML content with comments
        yaml_content = self._generate_yaml_config()
        
        config_path.write_text(yaml_content)
        
        if self.console:
            self.console.print(f"[green]✓[/green] Configuration saved to {config_path}")
        else:
            print(f"✓ Configuration saved to {config_path}")
        
        return config_path
    
    def _generate_yaml_config(self) -> str:
        """Generate YAML configuration with helpful comments"""
        lines = [
            "# Claudette Configuration",
            "# Generated by setup wizard",
            "",
            "# Claude CLI command (adjust path if needed)",
            f"claude_cmd: {self.config_data.get('claude_cmd', 'claude')}",
            "",
            "# Default backend selection (auto, claude, openai, mistral, ollama)",
            f"default_backend: {self.config_data.get('default_backend', 'auto')}",
            "",
        ]
        
        # Add backend-specific configuration
        if 'openai_model' in self.config_data:
            lines.extend([
                "# OpenAI Configuration",
                "# Set OPENAI_API_KEY environment variable",
                f"openai_model: {self.config_data['openai_model']}",
                "",
            ])
        
        if 'mistral_model' in self.config_data:
            lines.extend([
                "# Mistral Configuration", 
                "# Set MISTRAL_API_KEY environment variable",
                f"mistral_model: {self.config_data['mistral_model']}",
                "",
            ])
        
        if 'ollama_model' in self.config_data:
            lines.extend([
                "# Ollama Configuration",
                f"ollama_model: {self.config_data['ollama_model']}",
                f"ollama_url: {self.config_data.get('ollama_url', 'http://localhost:11434')}",
                "",
            ])
        
        # Add advanced options
        lines.extend([
            "# Advanced Configuration",
            f"cache_dir: {self.config_data.get('cache_dir', '~/.claudette/cache')}",
            f"history_enabled: {str(self.config_data.get('history_enabled', True)).lower()}",
            f"fallback_enabled: {str(self.config_data.get('fallback_enabled', True)).lower()}",
        ])
        
        return '\n'.join(lines)
    
    # Helper methods for user interaction
    def _ask_string(self, question: str, default: Optional[str] = None) -> str:
        """Ask for string input"""
        if self.console and RICH_AVAILABLE:
            return Prompt.ask(f"[cyan]?[/cyan] {question}", default=default)
        else:
            default_text = f" (default: {default})" if default else ""
            response = input(f"? {question}{default_text}: ").strip()
            return response or default or ""
    
    def _ask_yes_no(self, question: str, default: bool = True) -> bool:
        """Ask for yes/no input"""
        if self.console and RICH_AVAILABLE:
            return Confirm.ask(f"[cyan]?[/cyan] {question}", default=default)
        else:
            default_text = " (Y/n)" if default else " (y/N)"
            response = input(f"? {question}{default_text}: ").strip().lower()
            if not response:
                return default
            return response.startswith('y')
    
    def _ask_choice(self, question: str, choices: List[str], default: str) -> str:
        """Ask for choice from list"""
        if self.console and RICH_AVAILABLE:
            return Prompt.ask(
                f"[cyan]?[/cyan] {question}",
                choices=choices,
                default=default
            )
        else:
            print(f"? {question}")
            for i, choice in enumerate(choices):
                marker = ">" if choice == default else " "
                print(f"  {marker} {i + 1}. {choice}")
            
            while True:
                try:
                    response = input(f"Choice (1-{len(choices)}, default: {default}): ").strip()
                    if not response:
                        return default
                    
                    index = int(response) - 1
                    if 0 <= index < len(choices):
                        return choices[index]
                    else:
                        print(f"Please enter a number between 1 and {len(choices)}")
                except ValueError:
                    print("Please enter a valid number")


def run_setup_wizard(force_interactive: bool = False) -> Dict[str, Any]:
    """
    Run the setup wizard and return configuration
    
    Args:
        force_interactive: Force interactive mode even if auto-setup is possible
        
    Returns:
        Dictionary of configuration settings
    """
    wizard = SetupWizard()
    config_data = wizard.run(force_interactive=force_interactive)
    config_path = wizard.save_config()
    
    return {
        'config': config_data,
        'config_path': str(config_path),
        'auto_configured': not force_interactive and wizard._can_auto_setup()
    }


if __name__ == '__main__':
    # Command line interface for setup wizard
    import argparse
    
    parser = argparse.ArgumentParser(description='Claudette Setup Wizard')
    parser.add_argument('--interactive', '-i', action='store_true',
                      help='Force interactive mode')
    
    args = parser.parse_args()
    
    result = run_setup_wizard(force_interactive=args.interactive)
    
    print(f"\n🎉 Setup complete!")
    print(f"Configuration saved to: {result['config_path']}")
    if result['auto_configured']:
        print("✨ Auto-configured with detected settings")
    print("\nYou can now use claudette!")