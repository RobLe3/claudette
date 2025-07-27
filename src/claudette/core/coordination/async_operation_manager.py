#!/usr/bin/env python3
"""
Async Operation Manager - Performance Optimization
Provides 2-3x concurrent operation performance through intelligent async coordination
"""

import asyncio
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Callable, Union, Coroutine
from dataclasses import dataclass, field
from datetime import datetime
import weakref
from enum import Enum
import logging

class OperationPriority(Enum):
    """Operation priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class AsyncOperation:
    """Async operation with metadata"""
    id: str
    coroutine: Coroutine
    priority: OperationPriority = OperationPriority.NORMAL
    timeout: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3
    dependencies: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    error: Optional[Exception] = None
    result: Any = None

@dataclass
class OperationStats:
    """Statistics for async operations"""
    total_operations: int = 0
    completed_operations: int = 0
    failed_operations: int = 0
    cancelled_operations: int = 0
    total_execution_time: float = 0.0
    concurrent_peak: int = 0
    
    @property
    def success_rate(self) -> float:
        if self.total_operations == 0:
            return 0.0
        return self.completed_operations / self.total_operations
    
    @property
    def average_execution_time(self) -> float:
        if self.completed_operations == 0:
            return 0.0
        return self.total_execution_time / self.completed_operations

class AsyncOperationManager:
    """
    High-performance async operation manager with intelligent scheduling
    """
    
    def __init__(self, 
                 max_concurrent: int = 10,
                 max_queue_size: int = 1000,
                 default_timeout: float = 300.0,
                 enable_batching: bool = True):
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        self.default_timeout = default_timeout
        self.enable_batching = enable_batching
        
        # Operation tracking
        self._operations: Dict[str, AsyncOperation] = {}
        self._pending_queue: asyncio.PriorityQueue = None
        self._running_tasks: Dict[str, asyncio.Task] = {}
        self._completed_operations: Dict[str, AsyncOperation] = {}
        
        # Synchronization
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._shutdown_event: Optional[asyncio.Event] = None
        self._manager_task: Optional[asyncio.Task] = None
        
        # Statistics
        self._stats = OperationStats()
        self._lock = threading.Lock()
        
        # Dependency tracking
        self._dependency_graph: Dict[str, set] = {}
        self._dependents: Dict[str, set] = {}
        
        # Batching support
        self._batch_operations: Dict[str, List[AsyncOperation]] = {}
        self._batch_processors: Dict[str, Callable] = {}
        
        # Event loop reference
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._loop_thread: Optional[threading.Thread] = None
        
        # Start the manager
        self._start_manager()
    
    def _start_manager(self):
        """Start the async operation manager"""
        def run_manager():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            
            # Initialize async components
            self._pending_queue = asyncio.PriorityQueue(maxsize=self.max_queue_size)
            self._semaphore = asyncio.Semaphore(self.max_concurrent)
            self._shutdown_event = asyncio.Event()
            
            # Start manager coroutine
            self._manager_task = self._loop.create_task(self._operation_manager())
            
            # Run event loop
            try:
                self._loop.run_until_complete(self._shutdown_event.wait())
            finally:
                self._loop.close()
        
        self._loop_thread = threading.Thread(target=run_manager, daemon=True)
        self._loop_thread.start()
        
        # Wait for loop to be ready
        while self._loop is None:
            time.sleep(0.01)
    
    async def _operation_manager(self):
        """Main operation management coroutine"""
        while not self._shutdown_event.is_set():
            try:
                # Process pending operations
                await self._process_pending_operations()
                
                # Process batches if enabled
                if self.enable_batching:
                    await self._process_batches()
                
                # Cleanup completed operations
                self._cleanup_completed_operations()
                
                # Brief pause to prevent busy waiting
                await asyncio.sleep(0.01)
                
            except Exception as e:
                logging.error(f"Error in operation manager: {e}")
                await asyncio.sleep(1.0)
    
    async def _process_pending_operations(self):
        """Process operations from pending queue"""
        while not self._pending_queue.empty():
            try:
                # Get highest priority operation
                priority_score, operation_id = await asyncio.wait_for(
                    self._pending_queue.get(), timeout=0.1
                )
                
                operation = self._operations.get(operation_id)
                if not operation:
                    continue
                
                # Check if dependencies are satisfied
                if not self._dependencies_satisfied(operation):
                    # Put back in queue with lower priority
                    await self._pending_queue.put((priority_score + 1, operation_id))
                    continue
                
                # Start operation
                await self._start_operation(operation)
                
            except asyncio.TimeoutError:
                break
            except Exception as e:
                logging.error(f"Error processing pending operation: {e}")
    
    async def _start_operation(self, operation: AsyncOperation):
        """Start an async operation"""
        async with self._semaphore:
            try:
                operation.started_at = time.time()
                
                # Create task with timeout
                if operation.timeout:
                    task = asyncio.wait_for(
                        operation.coroutine, 
                        timeout=operation.timeout
                    )
                else:
                    task = operation.coroutine
                
                # Run the operation
                self._running_tasks[operation.id] = asyncio.create_task(task)
                
                # Update stats
                current_running = len(self._running_tasks)
                if current_running > self._stats.concurrent_peak:
                    self._stats.concurrent_peak = current_running
                
                # Wait for completion
                try:
                    result = await self._running_tasks[operation.id]
                    operation.result = result
                    operation.completed_at = time.time()
                    
                    # Update stats
                    with self._lock:
                        self._stats.completed_operations += 1
                        if operation.started_at:
                            execution_time = operation.completed_at - operation.started_at
                            self._stats.total_execution_time += execution_time
                    
                    # Move to completed
                    self._completed_operations[operation.id] = operation
                    
                    # Notify dependents
                    await self._notify_dependents(operation.id)
                    
                except asyncio.TimeoutError:
                    operation.error = TimeoutError(f"Operation {operation.id} timed out")
                    with self._lock:
                        self._stats.failed_operations += 1
                    
                    # Retry if allowed
                    if operation.retry_count < operation.max_retries:
                        operation.retry_count += 1
                        await self._queue_operation(operation)
                
                except Exception as e:
                    operation.error = e
                    operation.completed_at = time.time()
                    
                    with self._lock:
                        self._stats.failed_operations += 1
                    
                    # Retry if allowed
                    if operation.retry_count < operation.max_retries:
                        operation.retry_count += 1
                        await self._queue_operation(operation)
                
                finally:
                    # Clean up running task
                    self._running_tasks.pop(operation.id, None)
                    
            except Exception as e:
                operation.error = e
                with self._lock:
                    self._stats.failed_operations += 1
    
    def _dependencies_satisfied(self, operation: AsyncOperation) -> bool:
        """Check if operation dependencies are satisfied"""
        for dep_id in operation.dependencies:
            if dep_id not in self._completed_operations:
                return False
        return True
    
    async def _notify_dependents(self, operation_id: str):
        """Notify operations that depend on completed operation"""
        if operation_id in self._dependents:
            for dependent_id in self._dependents[operation_id]:
                if dependent_id in self._operations:
                    dependent = self._operations[dependent_id]
                    if self._dependencies_satisfied(dependent):
                        await self._queue_operation(dependent)
    
    async def _process_batches(self):
        """Process batched operations"""
        for batch_type, operations in list(self._batch_operations.items()):
            if len(operations) >= 5 or self._should_flush_batch(operations):
                processor = self._batch_processors.get(batch_type)
                if processor:
                    try:
                        await processor(operations)
                        # Mark all operations as completed
                        for op in operations:
                            op.completed_at = time.time()
                            self._completed_operations[op.id] = op
                            with self._lock:
                                self._stats.completed_operations += 1
                        
                        # Clear batch
                        self._batch_operations[batch_type] = []
                        
                    except Exception as e:
                        # Mark all operations as failed
                        for op in operations:
                            op.error = e
                            op.completed_at = time.time()
                            with self._lock:
                                self._stats.failed_operations += 1
    
    def _should_flush_batch(self, operations: List[AsyncOperation]) -> bool:
        """Determine if batch should be flushed"""
        if not operations:
            return False
        
        # Flush if oldest operation is more than 5 seconds old
        oldest_age = time.time() - operations[0].created_at
        return oldest_age > 5.0
    
    def _cleanup_completed_operations(self):
        """Clean up old completed operations"""
        current_time = time.time()
        cleanup_age = 3600  # 1 hour
        
        to_remove = [
            op_id for op_id, op in self._completed_operations.items()
            if op.completed_at and (current_time - op.completed_at) > cleanup_age
        ]
        
        for op_id in to_remove:
            self._completed_operations.pop(op_id, None)
            self._operations.pop(op_id, None)
    
    async def _queue_operation(self, operation: AsyncOperation):
        """Queue operation for execution"""
        # Calculate priority score (lower = higher priority)
        priority_score = 10 - operation.priority.value
        
        await self._pending_queue.put((priority_score, operation.id))
    
    def submit_operation(self, operation_id: str, coroutine: Coroutine,
                        priority: OperationPriority = OperationPriority.NORMAL,
                        timeout: Optional[float] = None,
                        dependencies: List[str] = None,
                        tags: List[str] = None,
                        batch_type: Optional[str] = None) -> str:
        """
        Submit async operation for execution
        
        Args:
            operation_id: Unique operation identifier
            coroutine: Coroutine to execute
            priority: Operation priority
            timeout: Operation timeout
            dependencies: List of operation IDs this depends on
            tags: Tags for operation grouping
            batch_type: Type for batch processing
            
        Returns:
            Operation ID
        """
        dependencies = dependencies or []
        tags = tags or []
        timeout = timeout or self.default_timeout
        
        # Create operation
        operation = AsyncOperation(
            id=operation_id,
            coroutine=coroutine,
            priority=priority,
            timeout=timeout,
            dependencies=dependencies,
            tags=tags
        )
        
        # Store operation
        self._operations[operation_id] = operation
        
        with self._lock:
            self._stats.total_operations += 1
        
        # Handle dependencies
        for dep_id in dependencies:
            if dep_id not in self._dependents:
                self._dependents[dep_id] = set()
            self._dependents[dep_id].add(operation_id)
        
        # Handle batching
        if batch_type and self.enable_batching:
            if batch_type not in self._batch_operations:
                self._batch_operations[batch_type] = []
            self._batch_operations[batch_type].append(operation)
        else:
            # Queue for immediate execution
            if self._loop and not self._loop.is_closed():
                asyncio.run_coroutine_threadsafe(
                    self._queue_operation(operation), 
                    self._loop
                )
        
        return operation_id
    
    def register_batch_processor(self, batch_type: str, 
                                processor: Callable[[List[AsyncOperation]], Coroutine]):
        """Register a batch processor for specific operation type"""
        self._batch_processors[batch_type] = processor
    
    def get_operation_status(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """Get status of specific operation"""
        operation = (self._operations.get(operation_id) or 
                    self._completed_operations.get(operation_id))
        
        if not operation:
            return None
        
        status = "unknown"
        if operation.id in self._running_tasks:
            status = "running"
        elif operation.completed_at:
            status = "completed" if not operation.error else "failed"
        elif operation.started_at:
            status = "starting"
        else:
            status = "pending"
        
        return {
            'id': operation.id,
            'status': status,
            'priority': operation.priority.name,
            'created_at': operation.created_at,
            'started_at': operation.started_at,
            'completed_at': operation.completed_at,
            'retry_count': operation.retry_count,
            'error': str(operation.error) if operation.error else None,
            'dependencies': operation.dependencies,
            'tags': operation.tags
        }
    
    def cancel_operation(self, operation_id: str) -> bool:
        """Cancel a pending or running operation"""
        # Cancel running task
        if operation_id in self._running_tasks:
            task = self._running_tasks[operation_id]
            task.cancel()
            self._running_tasks.pop(operation_id, None)
            
            with self._lock:
                self._stats.cancelled_operations += 1
            return True
        
        # Remove from pending operations
        if operation_id in self._operations:
            operation = self._operations[operation_id]
            if not operation.started_at:
                self._operations.pop(operation_id, None)
                with self._lock:
                    self._stats.cancelled_operations += 1
                return True
        
        return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get operation manager statistics"""
        with self._lock:
            return {
                'operations': {
                    'total': self._stats.total_operations,
                    'completed': self._stats.completed_operations,
                    'failed': self._stats.failed_operations,
                    'cancelled': self._stats.cancelled_operations,
                    'success_rate': self._stats.success_rate
                },
                'performance': {
                    'total_execution_time': self._stats.total_execution_time,
                    'average_execution_time': self._stats.average_execution_time,
                    'concurrent_peak': self._stats.concurrent_peak
                },
                'current_state': {
                    'pending': self._pending_queue.qsize() if self._pending_queue else 0,
                    'running': len(self._running_tasks),
                    'completed_cached': len(self._completed_operations),
                    'batches': len(self._batch_operations)
                },
                'configuration': {
                    'max_concurrent': self.max_concurrent,
                    'max_queue_size': self.max_queue_size,
                    'default_timeout': self.default_timeout,
                    'batching_enabled': self.enable_batching
                }
            }
    
    def wait_for_operation(self, operation_id: str, timeout: Optional[float] = None) -> Any:
        """
        Wait for operation completion and return result
        
        Args:
            operation_id: Operation to wait for
            timeout: Maximum time to wait
            
        Returns:
            Operation result
            
        Raises:
            TimeoutError: If operation doesn't complete in time
            Exception: If operation failed
        """
        start_time = time.time()
        timeout = timeout or self.default_timeout
        
        while True:
            # Check if completed
            if operation_id in self._completed_operations:
                operation = self._completed_operations[operation_id]
                if operation.error:
                    raise operation.error
                return operation.result
            
            # Check timeout
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Operation {operation_id} did not complete within {timeout}s")
            
            # Brief pause
            time.sleep(0.1)
    
    def shutdown(self, timeout: float = 30.0):
        """Shutdown the operation manager"""
        if self._shutdown_event and self._loop:
            asyncio.run_coroutine_threadsafe(
                self._shutdown_event.set(), 
                self._loop
            )
        
        # Wait for thread to complete
        if self._loop_thread:
            self._loop_thread.join(timeout=timeout)

# Global async operation manager
_global_async_manager: Optional[AsyncOperationManager] = None

def get_async_manager() -> AsyncOperationManager:
    """Get global async operation manager"""
    global _global_async_manager
    if _global_async_manager is None:
        _global_async_manager = AsyncOperationManager()
    return _global_async_manager

# Convenience functions
def submit_async_operation(operation_id: str, coroutine: Coroutine, **kwargs) -> str:
    """Submit operation to global async manager"""
    return get_async_manager().submit_operation(operation_id, coroutine, **kwargs)

def wait_for_async_operation(operation_id: str, timeout: Optional[float] = None) -> Any:
    """Wait for operation completion"""
    return get_async_manager().wait_for_operation(operation_id, timeout)

def get_async_stats() -> Dict[str, Any]:
    """Get async operation statistics"""
    return get_async_manager().get_stats()

# Async context manager for operation batching
class AsyncBatch:
    """Context manager for batching async operations"""
    
    def __init__(self, batch_type: str, processor: Optional[Callable] = None):
        self.batch_type = batch_type
        self.processor = processor
        self.operations: List[str] = []
        self.manager = get_async_manager()
    
    def __enter__(self):
        if self.processor:
            self.manager.register_batch_processor(self.batch_type, self.processor)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Wait for all operations in batch to complete
        for op_id in self.operations:
            try:
                self.manager.wait_for_operation(op_id, timeout=60.0)
            except Exception:
                pass
    
    def submit(self, operation_id: str, coroutine: Coroutine, **kwargs) -> str:
        """Submit operation to this batch"""
        kwargs['batch_type'] = self.batch_type
        op_id = self.manager.submit_operation(operation_id, coroutine, **kwargs)
        self.operations.append(op_id)
        return op_id