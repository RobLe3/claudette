#!/usr/bin/env python3
"""
Robust Timeout Handling System
"""

import subprocess
import threading
import time
import functools
from typing import Union, List, Optional

class TimeoutConfig:
    """Centralized timeout configuration"""
    QUICK_OPERATION = 5
    NORMAL_OPERATION = 30
    HEAVY_OPERATION = 120
    CLAUDE_BACKEND = 45

def robust_subprocess(cmd: Union[str, List[str]], 
                     timeout: Optional[float] = None,
                     retries: int = 2,
                     **kwargs) -> subprocess.CompletedProcess:
    """Robust subprocess execution with timeout and retries"""
    if timeout is None:
        timeout = TimeoutConfig.NORMAL_OPERATION
    
    if isinstance(cmd, str):
        cmd_list = cmd.split()
    else:
        cmd_list = cmd
    
    last_exception = None
    
    for attempt in range(retries + 1):
        try:
            result = subprocess.run(
                cmd_list,
                timeout=timeout,
                capture_output=kwargs.get('capture_output', True),
                text=kwargs.get('text', True),
                **{k: v for k, v in kwargs.items() if k not in ['capture_output', 'text']}
            )
            return result
            
        except subprocess.TimeoutExpired as e:
            last_exception = e
            if attempt < retries:
                time.sleep(1.0 * (1.5 ** attempt))
            continue
    
    raise last_exception

def timeout_decorator(timeout: float):
    """Decorator for adding timeout to functions"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = [None]
            exception = [None]
            
            def target():
                try:
                    result[0] = func(*args, **kwargs)
                except Exception as e:
                    exception[0] = e
            
            thread = threading.Thread(target=target)
            thread.daemon = True
            thread.start()
            thread.join(timeout)
            
            if thread.is_alive():
                raise TimeoutError(f"Operation timed out after {timeout} seconds")
            
            if exception[0]:
                raise exception[0]
            
            return result[0]
        
        return wrapper
    return decorator

# Common timeout decorators
quick_timeout = timeout_decorator(TimeoutConfig.QUICK_OPERATION)
normal_timeout = timeout_decorator(TimeoutConfig.NORMAL_OPERATION)
claude_timeout = timeout_decorator(TimeoutConfig.CLAUDE_BACKEND)
