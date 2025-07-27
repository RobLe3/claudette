#!/usr/bin/env python3
"""
Setup script for claudette development repository
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text() if readme_file.exists() else ""

# Read version from package
version = "2.0.0"

setup(
    name="claudette-dev",
    version=version,
    description="Claudette AI Tools Development Repository",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Claude Flow Development Team",
    author_email="dev@claudette.ai",
    url="https://github.com/RobLe3/claudette",
    
    # Package configuration
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    include_package_data=True,
    
    # Entry points
    entry_points={
        "console_scripts": [
            "claudette=claudette.main:cli",
        ],
    },
    
    # Dependencies
    install_requires=[
        "click>=8.0.0",
        "requests>=2.25.0",
        "pyyaml>=5.4.0",
        "tiktoken>=0.4.0",
        "openai>=1.0.0",
        "anthropic>=0.18.0",
    ],
    
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
            "mypy>=0.991",
        ],
    },
    
    # Metadata
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
)