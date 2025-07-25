# Experiments Directory

This directory contains experimental scripts and analysis tools that were moved from the project root during Phase 10 cleanup.

## Contents

### Core Experimental Components

- **`enhanced_model_switching.py`**: Advanced model selection algorithms
- **`claude_token_minimizer.py`**: Token optimization and reduction techniques
- **`chatgpt_cost_optimizer.py`**: Cost optimization for ChatGPT API usage
- **`cost_conservation_integration.py`**: Integrated cost conservation system
- **`quality_validation_framework.py`**: Quality assessment and validation tools

### Test & Analysis Scripts

- **`classification_accuracy_test.py`**: Model classification accuracy testing
- **`cost_comparison_test.py`**: Cost comparison analysis between models
- **`comprehensive_benchmark.py`**: Full system benchmarking suite
- **`enhanced_quality_test.py`**: Enhanced quality assessment tests
- **`swarm_cost_conservation_test.py`**: Swarm-based cost conservation testing
- **`test_model_selection_*.py`**: Model selection testing utilities
- **`side_by_side_comparison.py`**: Comparative analysis tools

### Legacy Tools

- **`claude-cost-tracker-new.py`**: Alternative cost tracking implementation

## Usage

These scripts are experimental and may require specific dependencies or configuration.

### Running Experiments

```bash
cd experiments/

# Run cost comparison analysis
python3 cost_comparison_test.py

# Test enhanced model switching
python3 enhanced_model_switching.py

# Benchmark the system
python3 comprehensive_benchmark.py
```

### Dependencies

Most experiments require the core claudette package:

```bash
pip install -e ..  # Install claudette from parent directory
```

## Status

These experiments represent various approaches and techniques explored during development:

- ✅ **Cost Conservation System**: Successfully integrated into main system (96% cost reduction achieved)
- 🧪 **Enhanced Model Switching**: Experimental implementation - not production ready
- 🧪 **Quality Validation Framework**: Experimental quality assessment tools
- 📊 **Benchmark Tools**: Used for performance analysis and validation

## Integration

Some experimental features have been integrated into the main codebase:

- Cost conservation techniques → `core/coordination/chatgpt_offloading_manager.py`
- Token minimization → Integrated into Claude Flow MCP system
- Quality validation → Incorporated into testing framework

## Archive Note

These files were moved from the project root during Phase 10 (Repository Cleanup & Consolidation) on 2025-07-22 to improve project organization and maintainability.

---

*For production features, use the main claudette package. These experiments are preserved for research and development purposes.*