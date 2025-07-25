#!/usr/bin/env python3
"""
Setup script for Claudette - Claude Code Middleware
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read version from __init__.py
init_file = Path(__file__).parent / 'claudette' / '__init__.py'
version_line = [line for line in init_file.read_text().split('\n') if line.startswith('__version__')]
version = version_line[0].split('=')[1].strip().strip('\'"') if version_line else '2.0.0'

# Read requirements
requirements_file = Path(__file__).parent / 'requirements.txt'
requirements = []
if requirements_file.exists():
    requirements = [
        line.strip() 
        for line in requirements_file.read_text().split('\n')
        if line.strip() and not line.startswith('#')
    ]

setup(
    name='claudette',
    version=version,
    description='Claude Code Middleware with Cost Optimization and Secure System Administration',
    long_description=Path('README.md').read_text() if Path('README.md').exists() else '',
    long_description_content_type='text/markdown',
    author='Claude Flow Project',
    author_email='noreply@claude-flow.com',
    url='https://github.com/ruvnet/claude-flow',
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    extras_require={
        'dev': [
            'pytest>=7.0.0',
            'black>=22.0.0',
            'flake8>=4.0.0',
            'mypy>=0.950',
        ],
        'secure': [
            'cryptography>=3.4.8',
            'keyring>=23.0.0',
        ]
    },
    entry_points={
        'console_scripts': [
            'claudette=claudette.main:cli',
            'claudette-launcher=claudette.main:cli',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Programming Language :: Python :: 3.13',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: System :: System Shells',
        'Topic :: Utilities',
    ],
    python_requires='>=3.8',
    keywords='claude ai cli middleware cost-optimization security sudo',
    project_urls={
        'Bug Reports': 'https://github.com/ruvnet/claude-flow/issues',
        'Source': 'https://github.com/ruvnet/claude-flow',
        'Documentation': 'https://github.com/ruvnet/claude-flow/tree/main/docs',
    },
)