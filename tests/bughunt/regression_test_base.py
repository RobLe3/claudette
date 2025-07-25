"""Base class for regression tests."""

import pytest
from abc import ABC, abstractmethod

class RegressionTestBase(ABC):
    """Base class for all regression tests."""
    
    @abstractmethod
    def test_bug_is_fixed(self):
        """Test that the specific bug is fixed."""
        pass
    
    @abstractmethod
    def get_bug_description(self):
        """Return description of the bug."""
        pass
    
    def setup_method(self):
        """Setup for each test method."""
        pass
    
    def teardown_method(self):
        """Cleanup after each test method."""
        pass