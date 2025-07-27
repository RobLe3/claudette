"""
Enhanced Progress Indicators for Claudette
Beautiful progress feedback for setup, preprocessing, and long operations
"""

import time
import threading
from typing import Optional, Dict, Any, List, Callable
from contextlib import contextmanager
from enum import Enum

try:
    from rich.console import Console
    from rich.progress import (
        Progress, SpinnerColumn, TextColumn, BarColumn, 
        TaskProgressColumn, TimeElapsedColumn, TimeRemainingColumn
    )
    from rich.panel import Panel
    from rich.table import Table
    from rich.live import Live
    from rich.layout import Layout
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class ProgressStyle(Enum):
    """Different styles of progress indicators"""
    SPINNER = "spinner"
    BAR = "bar"
    COUNTER = "counter"
    MULTI_TASK = "multi_task"
    LIVE_DASHBOARD = "live_dashboard"


class ProgressIndicator:
    """Enhanced progress indicator with multiple display modes"""
    
    def __init__(self, style: ProgressStyle = ProgressStyle.SPINNER):
        self.style = style
        self.console = Console() if RICH_AVAILABLE else None
        self.progress = None
        self.live = None
        self.tasks = {}
        self.active = False
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
    
    def start(self):
        """Start the progress indicator"""
        if not RICH_AVAILABLE or self.active:
            return
        
        if self.style == ProgressStyle.SPINNER:
            self.progress = Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            )
        elif self.style == ProgressStyle.BAR:
            self.progress = Progress(
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                TimeElapsedColumn(),
                TimeRemainingColumn(),
                console=self.console
            )
        elif self.style == ProgressStyle.COUNTER:
            self.progress = Progress(
                TextColumn("[progress.description]{task.description}"),
                TextColumn("[progress.percentage]{task.completed}/{task.total}"),
                TimeElapsedColumn(),
                console=self.console
            )
        elif self.style == ProgressStyle.MULTI_TASK:
            self.progress = Progress(
                TextColumn("{task.description}"),
                SpinnerColumn(),
                BarColumn(),
                TaskProgressColumn(),
                console=self.console
            )
        
        if self.progress:
            self.progress.start()
            self.active = True
    
    def stop(self):
        """Stop the progress indicator"""
        if self.progress and self.active:
            self.progress.stop()
            self.active = False
        
        if self.live:
            self.live.stop()
    
    def add_task(self, description: str, total: Optional[float] = None) -> int:
        """Add a new task to track"""
        if not self.progress:
            return 0
        
        task_id = self.progress.add_task(description, total=total)
        self.tasks[description] = task_id
        return task_id
    
    def update_task(self, task_id: int, advance: float = None, 
                   description: str = None, **kwargs):
        """Update task progress"""
        if self.progress:
            update_kwargs = {}
            if advance is not None:
                update_kwargs['advance'] = advance
            if description is not None:
                update_kwargs['description'] = description
            update_kwargs.update(kwargs)
            
            self.progress.update(task_id, **update_kwargs)
    
    def complete_task(self, task_id: int, message: str = None):
        """Mark task as complete"""
        if self.progress:
            if message:
                self.progress.update(task_id, description=f"✅ {message}")
            self.progress.update(task_id, completed=self.progress.tasks[task_id].total)


class SetupProgressIndicator:
    """Specialized progress indicator for setup wizard"""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
        self.steps_total = 0
        self.steps_completed = 0
        self.current_step = ""
    
    @contextmanager
    def setup_progress(self, total_steps: int):
        """Context manager for setup progress"""
        self.steps_total = total_steps
        self.steps_completed = 0
        
        if self.console:
            with Progress(
                TextColumn("[bold blue]Claudette Setup"),
                BarColumn(bar_width=None),
                TaskProgressColumn(),
                TextColumn("{task.description}"),
                console=self.console
            ) as progress:
                task = progress.add_task("Starting...", total=total_steps)
                self.progress = progress
                self.task_id = task
                yield self
        else:
            print("🚀 Claudette Setup Starting...")
            yield self
            print("✅ Setup Complete!")
    
    def step(self, description: str, work_func: Optional[Callable] = None):
        """Execute a setup step with progress indication"""
        self.current_step = description
        self.steps_completed += 1
        
        if self.console and hasattr(self, 'progress'):
            self.progress.update(
                self.task_id, 
                completed=self.steps_completed,
                description=f"Step {self.steps_completed}/{self.steps_total}: {description}"
            )
        else:
            print(f"[{self.steps_completed}/{self.steps_total}] {description}")
        
        # Execute work if provided
        if work_func:
            try:
                result = work_func()
                return result
            except Exception as e:
                if self.console and hasattr(self, 'progress'):
                    self.progress.update(
                        self.task_id,
                        description=f"❌ Step {self.steps_completed}: {description} - {e}"
                    )
                else:
                    print(f"❌ {description} failed: {e}")
                raise


class PreprocessingProgressIndicator:
    """Progress indicator for preprocessing operations"""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
    
    @contextmanager
    def preprocessing_progress(self, operation: str):
        """Context manager for preprocessing operations"""
        if self.console:
            with Progress(
                SpinnerColumn(),
                TextColumn("[cyan]Preprocessing"),
                TextColumn("[progress.description]{task.description}"),
                TimeElapsedColumn(),
                console=self.console
            ) as progress:
                task = progress.add_task(operation)
                yield lambda desc: progress.update(task, description=desc)
        else:
            print(f"🔄 Preprocessing: {operation}")
            yield lambda desc: print(f"  → {desc}")
            print("✅ Preprocessing complete")


class LiveDashboard:
    """Live updating dashboard for long operations"""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
        self.stats = {}
        self.active = False
    
    @contextmanager 
    def live_dashboard(self, title: str, refresh_rate: float = 0.5):
        """Context manager for live dashboard"""
        if not self.console:
            yield self
            return
        
        def generate_layout():
            layout = Layout()
            layout.split_column(
                Layout(Panel(f"[bold cyan]{title}[/bold cyan]", style="cyan"), size=3),
                Layout(self._create_stats_panel(), name="stats"),
                Layout(self._create_status_panel(), name="status", size=3)
            )
            return layout
        
        with Live(generate_layout(), refresh_per_second=1/refresh_rate, console=self.console) as live:
            self.live = live
            self.active = True
            yield self
            self.active = False
    
    def update_stat(self, key: str, value: Any, description: str = None):
        """Update a statistic in the dashboard"""
        self.stats[key] = {
            'value': value,
            'description': description or key.replace('_', ' ').title(),
            'updated': time.time()
        }
    
    def _create_stats_panel(self) -> Panel:
        """Create statistics panel"""
        if not self.stats:
            return Panel("No statistics available", title="Statistics")
        
        table = Table(show_header=True)
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="white")
        table.add_column("Updated", style="dim")
        
        for key, stat in self.stats.items():
            updated_ago = time.time() - stat['updated']
            time_text = f"{updated_ago:.1f}s ago" if updated_ago < 60 else f"{updated_ago/60:.1f}m ago"
            
            table.add_row(
                stat['description'],
                str(stat['value']),
                time_text
            )
        
        return Panel(table, title="Statistics", border_style="blue")
    
    def _create_status_panel(self) -> Panel:
        """Create status panel"""
        current_time = time.strftime("%H:%M:%S")
        return Panel(
            f"[dim]Live dashboard • Updated: {current_time} • Press Ctrl+C to stop[/dim]",
            border_style="dim"
        )


class OperationProgress:
    """Simple operation progress for common tasks"""
    
    def __init__(self, operation: str):
        self.operation = operation
        self.console = Console() if RICH_AVAILABLE else None
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        if self.console:
            self.console.print(f"[cyan]🔄 {self.operation}...[/cyan]")
        else:
            print(f"🔄 {self.operation}...")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time if self.start_time else 0
        
        if exc_type is None:
            if self.console:
                self.console.print(f"[green]✅ {self.operation} complete[/green] [dim]({duration:.1f}s)[/dim]")
            else:
                print(f"✅ {self.operation} complete ({duration:.1f}s)")
        else:
            if self.console:
                self.console.print(f"[red]❌ {self.operation} failed[/red] [dim]({duration:.1f}s)[/dim]")
            else:
                print(f"❌ {self.operation} failed ({duration:.1f}s)")


class MultiStepProgress:
    """Progress indicator for multi-step operations"""
    
    def __init__(self, steps: List[str], title: str = "Processing"):
        self.steps = steps
        self.title = title
        self.console = Console() if RICH_AVAILABLE else None
        self.current_step = 0
        self.step_results = {}
    
    @contextmanager
    def multi_step_progress(self):
        """Context manager for multi-step progress"""
        if self.console:
            with Progress(
                TextColumn(f"[bold]{self.title}"),
                BarColumn(),
                TaskProgressColumn(),
                TextColumn("{task.description}"),
                TimeElapsedColumn(),
                console=self.console
            ) as progress:
                task = progress.add_task("Starting...", total=len(self.steps))
                self.progress = progress
                self.task_id = task
                yield self
        else:
            print(f"🚀 {self.title}")
            yield self
            print("✅ All steps complete")
    
    def next_step(self, custom_description: str = None) -> str:
        """Move to next step"""
        if self.current_step >= len(self.steps):
            return ""
        
        step_name = self.steps[self.current_step]
        description = custom_description or step_name
        
        if self.console and hasattr(self, 'progress'):
            self.progress.update(
                self.task_id,
                completed=self.current_step + 1,
                description=f"[{self.current_step + 1}/{len(self.steps)}] {description}"
            )
        else:
            print(f"[{self.current_step + 1}/{len(self.steps)}] {description}")
        
        self.current_step += 1
        return step_name
    
    def mark_step_complete(self, result: Any = None):
        """Mark current step as complete"""
        if self.current_step > 0:
            step_name = self.steps[self.current_step - 1]
            self.step_results[step_name] = result
    
    def mark_step_failed(self, error: str):
        """Mark current step as failed"""
        if self.current_step > 0:
            step_name = self.steps[self.current_step - 1]
            self.step_results[step_name] = f"FAILED: {error}"


# Convenience functions for common progress patterns

@contextmanager
def setup_progress(total_steps: int):
    """Create setup progress indicator"""
    indicator = SetupProgressIndicator()
    with indicator.setup_progress(total_steps) as progress:
        yield progress


@contextmanager
def preprocessing_progress(operation: str):
    """Create preprocessing progress indicator"""
    indicator = PreprocessingProgressIndicator()
    with indicator.preprocessing_progress(operation) as progress:
        yield progress


@contextmanager
def operation_progress(operation: str):
    """Create simple operation progress"""
    with OperationProgress(operation) as progress:
        yield progress


@contextmanager
def multi_step_progress(steps: List[str], title: str = "Processing"):
    """Create multi-step progress indicator"""
    indicator = MultiStepProgress(steps, title)
    with indicator.multi_step_progress() as progress:
        yield progress


@contextmanager
def live_dashboard(title: str, refresh_rate: float = 0.5):
    """Create live dashboard"""
    dashboard = LiveDashboard()
    with dashboard.live_dashboard(title, refresh_rate) as dash:
        yield dash


# Simple fallback functions for when Rich is not available

def simple_progress_message(message: str, success: bool = True):
    """Show simple progress message when Rich unavailable"""
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")


def simple_step_message(step: int, total: int, description: str):
    """Show simple step message"""
    print(f"[{step}/{total}] {description}")


if __name__ == '__main__':
    # Test progress indicators
    import time
    
    # Test setup progress
    print("Testing Setup Progress:")
    with setup_progress(4) as setup:
        setup.step("Detecting environment", lambda: time.sleep(1))
        setup.step("Configuring backends", lambda: time.sleep(1))
        setup.step("Validating settings", lambda: time.sleep(1))
        setup.step("Saving configuration", lambda: time.sleep(1))
    
    print("\nTesting Multi-Step Progress:")
    with multi_step_progress(["Parse", "Process", "Validate", "Save"], "Data Processing") as multi:
        for _ in range(4):
            step = multi.next_step()
            time.sleep(0.5)
            multi.mark_step_complete(f"{step} done")
    
    print("\nTesting Preprocessing Progress:")
    with preprocessing_progress("Compressing prompt") as preproc:
        preproc("Analyzing tokens...")
        time.sleep(1)
        preproc("Applying compression...")
        time.sleep(1)
        preproc("Optimizing output...")
        time.sleep(1)
    
    print("\nTesting Live Dashboard:")
    with live_dashboard("Processing Data", 0.1) as dash:
        for i in range(10):
            dash.update_stat("processed_items", i * 100, "Items Processed")
            dash.update_stat("success_rate", f"{95 + i}%", "Success Rate")
            dash.update_stat("current_operation", f"Task {i+1}/10", "Current Task")
            time.sleep(0.5)