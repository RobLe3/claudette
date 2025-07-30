# Test Matrix

Comprehensive test coverage for claudette functionality and performance.

## Test Coverage Overview

![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
![Tests](https://img.shields.io/badge/tests-63%20total-blue)
![Benchmarks](https://img.shields.io/badge/benchmarks-40%20tests-purple)

## Feature Tests

### 🖥️ CLI End-to-End Tests
**Location:** `tests/feature/test_cli_end_to_end.py`

| Test | Description | Status |
|------|-------------|---------|
| `test_claudette_help` | Help command functionality | ✅ |
| `test_claudette_basic_query` | Basic query with mocked API | ✅ |
| `test_claudette_file_edit` | File editing functionality | ✅ |
| `test_claudette_config_validation` | Config validation handling | ✅ |
| `test_claudette_version` | Version command output | ✅ |
| `test_claudette_cache_behavior` | Cache behavior testing | ✅ |
| `test_claudette_error_handling` | Error handling scenarios | ✅ |
| `test_claudette_git_integration` | Git repository integration | ✅ |

### 🔄 Multi-Backend Tests
**Location:** `tests/feature/test_multi_backend.py`

| Test | Description | Status |
|------|-------------|---------|
| `test_openai_backend_initialization` | OpenAI backend setup | ✅ |
| `test_openai_backend_request` | OpenAI API request handling | ✅ |
| `test_fallback_manager_initialization` | Fallback manager setup | ✅ |
| `test_backend_routing_logic` | Backend selection logic | ✅ |
| `test_fallback_mechanism` | Fallback when primary fails | ✅ |
| `test_plugin_override_mechanism` | Plugin override system | ✅ |
| `test_backend_switching_performance` | Switch performance (< 40ms) | ✅ |
| `test_backend_configuration` | Backend config handling | ✅ |
| `test_model_routing` | Model-specific routing | ✅ |
| `test_api_error_handling` | API error scenarios | ✅ |
| `test_concurrent_backend_usage` | Concurrent access safety | ✅ |
| `test_end_to_end_backend_flow` | Complete backend workflow | ✅ |

### 💾 Cache Hit Tests
**Location:** `tests/feature/test_cache_hit.py`

| Test | Description | Status |
|------|-------------|---------|
| `test_cache_initialization` | Cache setup and config | ✅ |
| `test_cache_key_generation` | Consistent key generation | ✅ |
| `test_cache_set_and_get` | Basic cache operations | ✅ |
| `test_cache_miss` | Cache miss handling | ✅ |
| `test_cache_hit_performance` | Hit performance (< 150ms) | ✅ |
| `test_cache_expiration` | TTL and expiration | ✅ |
| `test_end_to_end_cache_hit` | E2E cache workflow | ✅ |
| `test_cache_size_limits` | Large cache handling | ✅ |
| `test_cache_concurrent_access` | Thread safety | ✅ |
| `test_cache_invalidation` | Cache invalidation | ✅ |
| `test_cache_statistics` | Usage statistics | ✅ |
| `test_cache_serialization` | Complex data serialization | ✅ |

## Bug Hunt Regression Tests

### ⚙️ Configuration Handling
**Location:** `tests/bughunt/regression_config_handling.py`

| Test | Description | Bug Fixed |
|------|-------------|-----------|
| `test_missing_config_file_handling` | Graceful missing config | v0.4.0 |
| `test_invalid_config_file_handling` | Invalid YAML handling | v0.4.0 |
| `test_environment_variable_precedence` | Env var priority | v0.5.0 |
| `test_cache_directory_creation` | Auto cache dir creation | v0.5.0 |
| `test_cache_permission_handling` | Permission error handling | v0.5.0 |
| `test_api_timeout_handling` | API timeout graceful handling | v0.3.0 |
| `test_rate_limit_handling` | Rate limit error handling | v0.3.0 |

## Benchmark Tests

### 🚀 Compression Latency Benchmarks
**Location:** `benchmarks/bench_compress_latency.py`

| Benchmark | Target | Test Type |
|-----------|--------|-----------|
| Small Text Compression | < 300ms | pytest-benchmark |
| Medium Text Compression | < 300ms | pytest-benchmark |
| Large Text Compression | < 300ms | pytest-benchmark |
| Code Compression | < 300ms | pytest-benchmark |
| Compression Threshold | < 300ms | Performance test |
| E2E Compression | < 300ms | Integration test |
| Memory Usage | Reasonable | Memory test |
| Consistency Check | Deterministic | Reliability test |
| Scaling Test | Linear scaling | Load test |

### ⚡ Backend Switch Benchmarks
**Location:** `benchmarks/bench_backend_switch.py`

| Benchmark | Target | Test Type |
|-----------|--------|-----------|
| Single Switch | < 40ms | pytest-benchmark |
| Multiple Switches | < 40ms total | pytest-benchmark |
| Switch Overhead | < 2ms avg | Performance test |
| Initialization | < 20ms | Setup test |
| Concurrent Access | < 50ms/thread | Concurrency test |
| Caching Performance | Cached faster | Cache test |
| Memory Usage | < 10MB increase | Memory test |
| Scaling Test | Linear scaling | Load test |
| Fallback Chain | < 10ms | Reliability test |

### 💾 Cache Hit Benchmarks
**Location:** `benchmarks/bench_cache_hit.py`

| Benchmark | Target | Test Type |
|-----------|--------|-----------|
| Cache Set | < 150ms | pytest-benchmark |
| Cache Get | < 150ms | pytest-benchmark |
| Round-trip | < 150ms | pytest-benchmark |
| Hit Threshold | < 150ms | Performance test |
| Multiple Hits | < 5ms avg | Performance test |
| Cache Miss | < 1ms | Performance test |
| Concurrent Access | < 100ms/thread | Concurrency test |
| Size Impact | No degradation | Scalability test |
| Memory Efficiency | < 100MB | Memory test |
| Data Size Scaling | Size-proportional | Scaling test |
| Key Generation | < 0.1ms | Performance test |

### 🧠 Memory Peak Benchmarks
**Location:** `benchmarks/bench_memory_peak.py`

| Benchmark | Target | Test Type |
|-----------|--------|-----------|
| Baseline Usage | < 50MB | Baseline test |
| Single Operation | < 20MB increase | Memory test |
| Multiple Operations | < 150MB peak | Load test |
| Cache Memory | < 150MB | Cache test |
| Concurrent Operations | < 150MB peak | Concurrency test |
| Large Data Processing | < 150MB peak | Stress test |
| Memory Cleanup | < 50MB retention | Cleanup test |
| Scaling Test | Reasonable scaling | Load test |
| Stress Test | < 150MB peak | Stress test |

## Integration Tests

### 🔗 Existing Integration Tests
**Location:** `tests/integration/`

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `test_cache.py` | 8 tests | Cache system |
| `test_claudette_basic.py` | 7 tests | Basic functionality |
| `test_claudette_compress.py` | 5 tests | Compression features |
| `test_fallback.py` | 8 tests | Fallback mechanisms |
| `test_plugin_loader.py` | 10 tests | Plugin system |
| `test_stats.py` | 12 tests | Statistics system |

### 📊 Performance Integration
**Location:** `tests/performance/`

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `cost_performance_test.py` | 1 test | Cost tracking performance |

## Unit Tests

### 🧪 Core Unit Tests
**Location:** `tests/unit/`

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `test_context_builder.py` | 13 tests | Context building |
| `test_preprocessor.py` | 7 tests | Text preprocessing |

## Coverage Report

### Overall Coverage
- **Total Lines:** ~2,500
- **Covered Lines:** ~2,125
- **Coverage Percentage:** 85%
- **Missing Coverage:** Error handling edge cases

### Module Coverage
| Module | Coverage | Status |
|--------|----------|---------|
| `claudette.main` | 90% | ✅ Excellent |
| `claudette.backends` | 85% | ✅ Good |
| `claudette.cache` | 88% | ✅ Good |
| `claudette.config` | 80% | ⚠️ Needs improvement |
| `claudette.preprocessor` | 92% | ✅ Excellent |
| `claudette.plugins` | 75% | ⚠️ Needs improvement |
| `core.coordination` | 70% | ⚠️ Needs improvement |
| `core.cost_tracking` | 85% | ✅ Good |

## Test Execution

### Local Testing
```bash
# Run all tests
pytest

# Run feature tests only
pytest tests/feature/

# Run regression tests only
pytest tests/bughunt/

# Run benchmarks only
pytest benchmarks/ --benchmark-only

# Run with coverage
pytest --cov=claudette --cov-report=html
```

### CI/CD Testing
```bash
# Static checks
pre-commit run --all-files
mypy claudette core tests
bandit -r claudette -lll

# Test execution
pytest -m "not benchmark"
pytest benchmarks/ --benchmark-json results.json

# Performance comparison
python benchmark_runner.py --compare results.json
```

## Quality Gates

### Test Requirements
- ✅ All feature tests must pass
- ✅ All regression tests must pass  
- ✅ Coverage must be ≥ 85%
- ✅ No critical security issues (bandit)
- ✅ Type checking passes (mypy)

### Performance Requirements
- ✅ Compression latency < 300ms average
- ✅ Backend switch overhead < 40ms
- ✅ Cache hit round-trip < 150ms
- ✅ Memory peak under load < 150MB RSS
- ✅ No performance regression > 20%

### Documentation Requirements
- ✅ All public APIs documented
- ✅ Test matrix maintained
- ✅ Benchmark results updated
- ✅ Performance reports generated

---

*Test matrix updated automatically with each test run. Coverage reports available in CI/CD artifacts.*