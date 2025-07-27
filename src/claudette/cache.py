"""
Session caching system for Claudette
Stores prompts, responses, and metadata to avoid recompression
"""

import sqlite3
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


class CacheManager:
    """SQLite-based caching for claudette sessions"""
    
    def __init__(self, cache_dir: str = None):
        """Initialize cache manager with database path"""
        if cache_dir is None:
            cache_dir = os.path.expanduser("~/.claudette/cache")
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.cache_dir / "claudette.db"
        
        self._init_database()
    
    def _init_database(self):
        """Create database table if it doesn't exist"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    cmd TEXT NOT NULL,
                    files TEXT NOT NULL,
                    prompt_hash TEXT NOT NULL,
                    file_digest TEXT NOT NULL,
                    backend TEXT NOT NULL,
                    compressed_tokens INTEGER,
                    response_hash TEXT,
                    raw_prompt TEXT,
                    compressed_prompt TEXT
                )
            ''')
            
            # Create index for faster lookups
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_cache_lookup 
                ON events (prompt_hash, file_digest, backend)
            ''')
            
            conn.commit()
    
    def compute_prompt_hash(self, prompt: str) -> str:
        """Compute SHA256 hash of prompt text"""
        return hashlib.sha256(prompt.encode('utf-8')).hexdigest()
    
    def compute_file_digest(self, files: List[str]) -> str:
        """Compute combined hash of file contents"""
        if not files:
            return hashlib.sha256(b'').hexdigest()
        
        combined_content = []
        
        for file_path in sorted(files):  # Sort for consistency
            try:
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                    file_hash = hashlib.sha256(file_content).hexdigest()
                    combined_content.append(f"{file_path}:{file_hash}")
            except (IOError, OSError):
                # File doesn't exist or can't read, use empty hash
                combined_content.append(f"{file_path}:empty")
        
        combined_str = "|".join(combined_content)
        return hashlib.sha256(combined_str.encode('utf-8')).hexdigest()
    
    def compute_response_hash(self, response: str) -> str:
        """Compute SHA256 hash of response text"""
        return hashlib.sha256(response.encode('utf-8')).hexdigest()
    
    def lookup(self, prompt_hash: str, file_digest: str, backend: str = None) -> Optional[Dict[str, Any]]:
        """
        Look up cached entry by prompt and file hashes
        
        Args:
            prompt_hash: SHA256 of the prompt
            file_digest: SHA256 of file contents
            backend: Backend name (optional filter)
            
        Returns:
            Cached event dict or None if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            if backend:
                cursor = conn.execute('''
                    SELECT * FROM events 
                    WHERE prompt_hash = ? AND file_digest = ? AND backend = ?
                    ORDER BY timestamp DESC LIMIT 1
                ''', (prompt_hash, file_digest, backend))
            else:
                cursor = conn.execute('''
                    SELECT * FROM events 
                    WHERE prompt_hash = ? AND file_digest = ?
                    ORDER BY timestamp DESC LIMIT 1
                ''', (prompt_hash, file_digest))
            
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def save_event(self, event: Dict[str, Any]):
        """
        Save session event to cache database
        
        Args:
            event: Event dictionary with required fields
        """
        required_fields = ['timestamp', 'cmd', 'files', 'prompt_hash', 
                          'file_digest', 'backend']
        
        for field in required_fields:
            if field not in event:
                raise ValueError(f"Missing required field: {field}")
        
        # Convert files list to JSON string for storage
        files_json = json.dumps(event['files']) if isinstance(event['files'], list) else event['files']
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO events (
                    timestamp, cmd, files, prompt_hash, file_digest, backend,
                    compressed_tokens, response_hash, raw_prompt, compressed_prompt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                event['timestamp'],
                event['cmd'],
                files_json,
                event['prompt_hash'],
                event['file_digest'],
                event['backend'],
                event.get('compressed_tokens'),
                event.get('response_hash'),
                event.get('raw_prompt'),
                event.get('compressed_prompt')
            ))
            conn.commit()
    
    def get_history(self, limit: int = None, pattern: str = None) -> List[Dict[str, Any]]:
        """
        Get session history with optional filtering
        
        Args:
            limit: Maximum number of entries to return
            pattern: Grep pattern to match in raw_prompt
            
        Returns:
            List of event dictionaries, newest first
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = "SELECT * FROM events"
            params = []
            
            if pattern:
                query += " WHERE raw_prompt LIKE ?"
                params.append(f"%{pattern}%")
            
            query += " ORDER BY timestamp DESC"
            
            if limit:
                query += " LIMIT ?"
                params.append(limit)
            
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def clear_cache(self):
        """Clear all cached entries"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM events")
            conn.commit()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) as total FROM events")
            total = cursor.fetchone()[0]
            
            cursor = conn.execute('''
                SELECT backend, COUNT(*) as count 
                FROM events 
                GROUP BY backend 
                ORDER BY count DESC
            ''')
            backends = dict(cursor.fetchall())
            
            cursor = conn.execute('''
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM events 
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
                LIMIT 7
            ''')
            daily = dict(cursor.fetchall())
            
            return {
                'total_events': total,
                'backends': backends,
                'daily_usage': daily,
                'db_path': str(self.db_path),
                'db_size_mb': round(self.db_path.stat().st_size / 1024 / 1024, 2) if self.db_path.exists() else 0
            }


def create_cache_event(cmd: str, files: List[str], raw_prompt: str, 
                      compressed_prompt: str, backend: str, 
                      compressed_tokens: int = None, response: str = None) -> Dict[str, Any]:
    """
    Create a cache event dictionary
    
    Args:
        cmd: Command type (edit, commit, new)
        files: List of file paths
        raw_prompt: Original prompt text
        compressed_prompt: Processed prompt text
        backend: Backend name used
        compressed_tokens: Token count after compression
        response: Backend response text
        
    Returns:
        Event dictionary ready for caching
    """
    cache_manager = CacheManager()
    
    prompt_hash = cache_manager.compute_prompt_hash(raw_prompt)
    file_digest = cache_manager.compute_file_digest(files)
    response_hash = cache_manager.compute_response_hash(response) if response else None
    
    return {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'cmd': cmd,
        'files': files,
        'prompt_hash': prompt_hash,
        'file_digest': file_digest,
        'backend': backend,
        'compressed_tokens': compressed_tokens,
        'response_hash': response_hash,
        'raw_prompt': raw_prompt,
        'compressed_prompt': compressed_prompt
    }


# Global cache manager instance
_cache_manager = None

def get_cache_manager(cache_dir: str = None) -> CacheManager:
    """Get or create global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager(cache_dir)
    return _cache_manager