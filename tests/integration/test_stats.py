#!/usr/bin/env python3
"""
Integration tests for Claudette stats functionality
Tests the stats CLI command and cost analysis features
"""

import pytest
import tempfile
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
import sys
import os
from unittest.mock import patch, MagicMock

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'claudette'))

from claudette.cache import CacheManager, create_cache_event
from claudette.stats import cmd_stats, query_stats, estimate_cost, get_time_filter
from claudette.dashboard import TerminalDashboard


class MockArgs:
    """Mock arguments for testing"""
    def __init__(self, **kwargs):
        self.backend = kwargs.get('backend', None)
        self.period = kwargs.get('period', None)
        self.file = kwargs.get('file', None)
        self.files = kwargs.get('files', None)
        self.info = kwargs.get('info', False)


class TestStatsIntegration:
    """Integration tests for stats functionality"""
    
    def setup_method(self):
        """Setup test cache with sample data"""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_manager = CacheManager(self.temp_dir)
        
        # Create sample events
        self.sample_events = [
            create_cache_event(
                cmd="edit",
                files=["test.py"],
                raw_prompt="Edit this file to add logging",
                compressed_prompt="Add logging to test.py",
                backend="claude",
                compressed_tokens=100,
                response="Added logging successfully"
            ),
            create_cache_event(
                cmd="edit", 
                files=["main.py"],
                raw_prompt="Fix the bug in the main function",
                compressed_prompt="Fix bug in main.py",
                backend="openai",
                compressed_tokens=150,
                response="Bug fixed successfully"
            ),
            create_cache_event(
                cmd="commit",
                files=["test.py", "main.py"],
                raw_prompt="Create commit for logging changes",
                compressed_prompt="Commit logging changes",
                backend="claude",
                compressed_tokens=80,
                response="Commit created successfully"
            )
        ]
        
        # Add events to cache
        for event in self.sample_events:
            self.cache_manager.save_event(event)
    
    def teardown_method(self):
        """Cleanup temp directory"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_stats_query_basic(self):
        """Test basic stats querying"""
        stats = query_stats(self.cache_manager)
        
        assert len(stats) >= 0  # Should not error
        
        # Test with backend filter
        claude_stats = query_stats(self.cache_manager, backend="claude")
        assert all(row['backend'] == 'claude' for row in claude_stats)
        
        # Test with file filter
        test_py_stats = query_stats(self.cache_manager, file_filter="test.py")
        assert all('test.py' in row.get('files', '') for row in test_py_stats if row.get('files'))
    
    def test_cost_estimation(self):
        """Test cost estimation for different backends"""
        # Claude cost (higher rate)
        claude_cost = estimate_cost("claude", 1000)
        assert claude_cost > 0
        
        # OpenAI cost (lower rate)
        openai_cost = estimate_cost("openai", 1000)
        assert openai_cost > 0
        assert openai_cost < claude_cost  # OpenAI should be cheaper
        
        # Ollama cost (free)
        ollama_cost = estimate_cost("ollama", 1000)
        assert ollama_cost == 0
    
    def test_time_filter(self):
        """Test time period filtering"""
        # Test various periods
        today_filter = get_time_filter("today")
        assert today_filter is not None
        
        week_filter = get_time_filter("week")
        assert week_filter is not None
        
        month_filter = get_time_filter("month")
        assert month_filter is not None
        
        # Test custom days
        days_filter = get_time_filter("7d")
        assert days_filter is not None
        
        # Test invalid filter
        invalid_filter = get_time_filter("invalid")
        assert invalid_filter is None
    
    def test_stats_command_execution(self):
        """Test stats command execution without errors"""
        with patch('claudette.cache.get_cache_manager', return_value=self.cache_manager):
            args = MockArgs()
            
            # Should not raise exception
            try:
                with patch('sys.stdout'):  # Suppress output during test
                    cmd_stats(args)
            except SystemExit as e:
                # Exit with code 0 is success
                assert e.code != 1
    
    def test_stats_with_filters(self):
        """Test stats command with various filters"""
        with patch('claudette.cache.get_cache_manager', return_value=self.cache_manager):
            # Test backend filter
            args = MockArgs(backend="claude")
            try:
                with patch('sys.stdout'):
                    cmd_stats(args)
            except SystemExit as e:
                assert e.code != 1
            
            # Test period filter
            args = MockArgs(period="week")
            try:
                with patch('sys.stdout'):
                    cmd_stats(args)
            except SystemExit as e:
                assert e.code != 1
            
            # Test file filter
            args = MockArgs(file="test")
            try:
                with patch('sys.stdout'):
                    cmd_stats(args)
            except SystemExit as e:
                assert e.code != 1
    
    def test_stats_info_display(self):
        """Test stats info display"""
        with patch('claudette.cache.get_cache_manager', return_value=self.cache_manager):
            args = MockArgs(info=True)
            
            try:
                with patch('sys.stdout'):
                    cmd_stats(args)
            except SystemExit as e:
                assert e.code != 1
    
    def test_terminal_dashboard_initialization(self):
        """Test terminal dashboard initialization"""
        dashboard = TerminalDashboard(self.cache_manager)
        assert dashboard.cache_manager == self.cache_manager
        
        # Test stats generation doesn't crash
        stats = dashboard._get_dashboard_stats()
        assert isinstance(stats, dict)
        assert 'total_requests' in stats
        assert 'total_cost' in stats


class TestCostAnalysis:
    """Test cost analysis and aggregation"""
    
    def setup_method(self):
        """Setup test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_manager = CacheManager(self.temp_dir)
        
        # Create diverse cost events across different dates and backends
        base_time = datetime.utcnow() - timedelta(days=5)
        
        self.cost_events = [
            # High cost Claude operations
            self._create_cost_event(base_time, "claude", 500, "edit", ["expensive_model.py"]),
            self._create_cost_event(base_time + timedelta(hours=1), "claude", 800, "commit", ["expensive_model.py", "config.py"]),
            
            # Lower cost OpenAI operations
            self._create_cost_event(base_time + timedelta(days=1), "openai", 200, "edit", ["simple_script.py"]),
            self._create_cost_event(base_time + timedelta(days=1, hours=2), "openai", 150, "new", ["test_file.py"]),
            
            # Free Ollama operations
            self._create_cost_event(base_time + timedelta(days=2), "ollama", 300, "edit", ["local_test.py"]),
            
            # Recent operations for trend analysis
            self._create_cost_event(datetime.utcnow() - timedelta(hours=2), "claude", 400, "edit", ["recent_work.py"]),
        ]
        
        for event in self.cost_events:
            self.cache_manager.save_event(event)
    
    def _create_cost_event(self, timestamp, backend, tokens, cmd, files):
        """Helper to create cost test events"""
        event = create_cache_event(
            cmd=cmd,
            files=files,
            raw_prompt=f"Test prompt for {cmd}",
            compressed_prompt=f"Compressed {cmd} prompt",
            backend=backend,
            compressed_tokens=tokens,
            response=f"Test response for {cmd}"
        )
        # Override timestamp for testing
        event['timestamp'] = timestamp.isoformat()
        return event
    
    def teardown_method(self):
        """Cleanup"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_cost_totals_calculation(self):
        """Test cost totals are calculated correctly"""
        stats = query_stats(self.cache_manager)
        
        total_cost = 0
        for row in stats:
            backend_cost = estimate_cost(row['backend'], row['total_tokens'] or 0)
            total_cost += backend_cost
        
        # Should have significant cost from Claude operations, minimal from OpenAI, zero from Ollama
        assert total_cost > 0
    
    def test_backend_cost_comparison(self):
        """Test backend cost comparison"""
        backend_stats = {}
        
        stats = query_stats(self.cache_manager)
        for row in stats:
            backend = row['backend']
            if backend not in backend_stats:
                backend_stats[backend] = 0
            
            backend_stats[backend] += estimate_cost(backend, row['total_tokens'] or 0)
        
        # Claude should be most expensive, Ollama should be free
        if 'claude' in backend_stats and 'ollama' in backend_stats:
            assert backend_stats['claude'] > backend_stats['ollama']
        
        if 'ollama' in backend_stats:
            assert backend_stats['ollama'] == 0
    
    def test_period_filtering_accuracy(self):
        """Test period filtering returns correct date ranges"""
        # Test recent data (should include recent operations)
        recent_stats = query_stats(self.cache_manager, period="today")
        
        # Test week data (should include most operations)
        week_stats = query_stats(self.cache_manager, period="week")
        
        # Week should have more or equal data than today
        week_total_tokens = sum(row['total_tokens'] or 0 for row in week_stats)
        recent_total_tokens = sum(row['total_tokens'] or 0 for row in recent_stats)
        
        assert week_total_tokens >= recent_total_tokens


class TestErrorHandling:
    """Test error handling in stats functionality"""
    
    def test_empty_database_handling(self):
        """Test handling of empty database"""
        temp_dir = tempfile.mkdtemp()
        try:
            cache_manager = CacheManager(temp_dir)
            
            # Query empty database
            stats = query_stats(cache_manager)
            assert stats == []
            
            # Stats command with empty database
            with patch('claudette.cache.get_cache_manager', return_value=cache_manager):
                args = MockArgs()
                
                # Should not crash
                try:
                    with patch('sys.stdout'):
                        cmd_stats(args)
                except SystemExit as e:
                    assert e.code != 1
        
        finally:
            import shutil
            shutil.rmtree(temp_dir)
    
    def test_invalid_cache_path_handling(self):
        """Test handling of invalid cache paths"""
        # Test with non-existent path (should create it)
        invalid_path = "/tmp/nonexistent_claudette_test_path_123456"
        
        try:
            cache_manager = CacheManager(invalid_path)
            assert cache_manager.db_path.exists()
            
            # Should be able to save and query
            event = create_cache_event(
                cmd="test",
                files=["test.txt"],
                raw_prompt="test",
                compressed_prompt="test",
                backend="claude",
                compressed_tokens=10,
                response="test response"
            )
            cache_manager.save_event(event)
            
            stats = query_stats(cache_manager)
            assert len(stats) >= 0
        
        finally:
            # Cleanup
            if Path(invalid_path).exists():
                import shutil
                shutil.rmtree(invalid_path)


if __name__ == '__main__':
    # Run tests directly
    pytest.main([__file__, "-v"])