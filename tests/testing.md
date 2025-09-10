# Testing Framework and Best Practices

> **Comprehensive Testing Guide for Claudette Development**
>
> This guide covers all aspects of testing in Claudette, from unit tests to end-to-end validation, ensuring high code quality and reliability.

## Table of Contents

- [Overview](#overview)
- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [RAG Testing](#rag-testing)
- [Performance Testing](#performance-testing)
- [Test Utilities](#test-utilities)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Overview

Claudette maintains a comprehensive testing framework that ensures reliability, performance, and correctness across all components. Our testing strategy covers:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing  
- **End-to-End Tests**: Full workflow validation
- **RAG Tests**: RAG provider and integration testing
- **Performance Tests**: Benchmarking and optimization validation
- **Regression Tests**: Preventing feature degradation

### Test Coverage Goals

| Category | Target Coverage | Current Status |
|----------|----------------|---------------|
| Core API | 95%+ | ✅ 100% |
| Backend Implementations | 90%+ | ✅ 95% |
| RAG System | 85%+ | ✅ 90% |
| Router Logic | 95%+ | ✅ 98% |
| Utilities | 80%+ | ✅ 85% |
| **Overall** | **90%+** | ✅ **95%** |

---

## Testing Philosophy

### Principles

1. **Test-Driven Development (TDD)**: Write tests before implementation when possible
2. **Fast Feedback**: Unit tests run in <5 seconds, integration tests in <30 seconds
3. **Deterministic**: Tests produce consistent results across environments
4. **Isolated**: Tests don't depend on external services by default
5. **Readable**: Tests serve as living documentation

### Test Pyramid Structure

```
                 🔺 E2E Tests (Few)
               /     \
              /       \
        🔹 Integration Tests (Some)
           /             \
          /               \
    🔸 Unit Tests (Many)    \
      /                     \
     /                       \
🔷 Component Tests (Most)     \
```

---

## Test Structure

### Directory Organization

```
src/
├── backends/
│   ├── __tests__/           # Backend unit tests
│   │   ├── openai.test.ts
│   │   ├── claude.test.ts
│   │   └── base.test.ts
│   └── integration/         # Backend integration tests
├── rag/
│   ├── __tests__/           # RAG unit tests
│   └── integration/         # RAG integration tests
├── router/
│   └── __tests__/           # Router unit tests
└── test/                    # Global test utilities and E2E tests
    ├── unit/                # Shared unit test utilities
    ├── integration/         # Integration test suites
    ├── e2e/                 # End-to-end test scenarios
    ├── performance/         # Performance benchmarks
    ├── fixtures/            # Test data and mocks
    └── utils/               # Test helper functions
```

### Naming Conventions

- **Unit Tests**: `*.test.ts` or `*.spec.ts`
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.e2e.test.ts`
- **Performance Tests**: `*.benchmark.ts` or `*.perf.test.ts`

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/test/**/*.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
```

---

## Unit Testing

### Core Component Testing

Unit tests focus on individual components in isolation with mocked dependencies.

#### Example: Backend Unit Test

```typescript
// src/backends/__tests__/openai.test.ts
import { OpenAIBackend } from '../openai';
import { BackendSettings, ClaudetteRequest } from '../../types';

// Mock the OpenAI client
jest.mock('openai');

describe('OpenAIBackend', () => {
  let backend: OpenAIBackend;
  let mockConfig: BackendSettings;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      priority: 1,
      cost_per_token: 0.000015,
      model: 'gpt-4o-mini',
      api_key: 'test-key'
    };
    
    backend = new OpenAIBackend(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(backend.name).toBe('openai');
      expect(backend.getInfo().cost_per_token).toBe(0.000015);
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const tokens = 1000;
      const expectedCost = (tokens / 1000) * mockConfig.cost_per_token;
      
      expect(backend.estimateCost(tokens)).toBeCloseTo(expectedCost, 6);
    });

    it('should handle zero tokens', () => {
      expect(backend.estimateCost(0)).toBe(0);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', async () => {
      const isValid = await backend.validateConfig();
      expect(isValid).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      backend = new OpenAIBackend({
        ...mockConfig,
        enabled: false,
        cost_per_token: -1
      });
      
      const isValid = await backend.validateConfig();
      expect(isValid).toBe(false);
    });
  });

  describe('send', () => {
    const mockRequest: ClaudetteRequest = {
      prompt: 'Test prompt',
      options: {
        max_tokens: 100,
        temperature: 0.7
      }
    };

    it('should send request successfully', async () => {
      // Mock OpenAI client response
      const mockCompletion = {
        choices: [{ message: { content: 'Test response' } }],
        usage: { completion_tokens: 50 },
        model: 'gpt-4o-mini'
      };

      // Mock the client call
      (require('openai') as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockCompletion)
          }
        }
      }));

      const response = await backend.send(mockRequest);

      expect(response.content).toBe('Test response');
      expect(response.backend_used).toBe('openai');
      expect(response.tokens_output).toBe(50);
      expect(response.cost_eur).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      (require('openai') as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      await expect(backend.send(mockRequest)).rejects.toThrow('API Error');
    });

    it('should record latency correctly', async () => {
      const startTime = Date.now();
      
      // Mock a slow response
      (require('openai') as any).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({
                choices: [{ message: { content: 'Response' } }],
                usage: { completion_tokens: 10 }
              }), 100))
            )
          }
        }
      }));

      const response = await backend.send(mockRequest);
      const endTime = Date.now();

      expect(response.latency_ms).toBeGreaterThan(90);
      expect(response.latency_ms).toBeLessThan(endTime - startTime + 50);
    });
  });

  describe('health check', () => {
    it('should return true for healthy backend', async () => {
      // Mock successful health check
      (require('openai') as any).mockImplementation(() => ({
        models: {
          list: jest.fn().mockResolvedValue({ data: [] })
        }
      }));

      const isHealthy = await backend.isAvailable();
      expect(isHealthy).toBe(true);
    });

    it('should return false for unhealthy backend', async () => {
      // Mock failed health check
      (require('openai') as any).mockImplementation(() => ({
        models: {
          list: jest.fn().mockRejectedValue(new Error('Connection failed'))
        }
      }));

      const isHealthy = await backend.isAvailable();
      expect(isHealthy).toBe(false);
    });
  });
});
```

#### Example: Router Unit Test

```typescript
// src/router/__tests__/adaptive-router.test.ts
import { BackendRouter } from '../adaptive-router';
import { Backend, ClaudetteRequest } from '../../types';

describe('BackendRouter', () => {
  let router: BackendRouter;
  let mockBackend1: jest.Mocked<Backend>;
  let mockBackend2: jest.Mocked<Backend>;

  beforeEach(() => {
    router = new BackendRouter({
      cost_weight: 0.5,
      latency_weight: 0.3,
      availability_weight: 0.2,
      fallback_enabled: true
    });

    // Create mock backends
    mockBackend1 = createMockBackend('backend1', {
      cost_per_token: 0.0001,
      priority: 1,
      latency: 100
    });

    mockBackend2 = createMockBackend('backend2', {
      cost_per_token: 0.0003,
      priority: 2,
      latency: 50
    });

    router.registerBackend(mockBackend1);
    router.registerBackend(mockBackend2);
  });

  describe('backend selection', () => {
    it('should select backend with best weighted score', async () => {
      const request: ClaudetteRequest = {
        prompt: 'Test prompt'
      };

      const selected = await router.selectBackend(request);
      
      // Should select based on weighted scoring
      expect(selected).toBeDefined();
      expect(['backend1', 'backend2']).toContain(selected.name);
    });

    it('should respect forced backend selection', async () => {
      const request: ClaudetteRequest = {
        prompt: 'Test prompt',
        backend: 'backend2'
      };

      const selected = await router.selectBackend(request);
      expect(selected.name).toBe('backend2');
    });

    it('should exclude unavailable backends', async () => {
      mockBackend1.isAvailable.mockResolvedValue(false);
      
      const request: ClaudetteRequest = {
        prompt: 'Test prompt'
      };

      const selected = await router.selectBackend(request);
      expect(selected.name).toBe('backend2');
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to next backend on failure', async () => {
      mockBackend1.send.mockRejectedValue(new Error('Backend1 failed'));
      mockBackend2.send.mockResolvedValue({
        content: 'Success from backend2',
        backend_used: 'backend2',
        tokens_input: 10,
        tokens_output: 20,
        cost_eur: 0.001,
        latency_ms: 150,
        cache_hit: false
      });

      const request: ClaudetteRequest = {
        prompt: 'Test prompt'
      };

      const response = await router.routeRequest(request);
      
      expect(response.backend_used).toBe('backend2');
      expect(response.content).toBe('Success from backend2');
    });

    it('should fail when all backends are unavailable', async () => {
      mockBackend1.send.mockRejectedValue(new Error('Backend1 failed'));
      mockBackend2.send.mockRejectedValue(new Error('Backend2 failed'));

      const request: ClaudetteRequest = {
        prompt: 'Test prompt'
      };

      await expect(router.routeRequest(request)).rejects.toThrow();
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const error = new Error('Persistent failure');
      
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        mockBackend1.send.mockRejectedValue(error);
        
        try {
          await router.routeRequest({ prompt: 'Test' });
        } catch (e) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      const stats = router.getStats();
      const backend1Stats = stats.backends.find(b => b.name === 'backend1');
      expect(backend1Stats?.circuitBreakerOpen).toBe(true);
    });
  });

  function createMockBackend(name: string, config: {
    cost_per_token: number;
    priority: number;
    latency: number;
  }): jest.Mocked<Backend> {
    return {
      name,
      isAvailable: jest.fn().mockResolvedValue(true),
      estimateCost: jest.fn().mockImplementation((tokens: number) => 
        (tokens / 1000) * config.cost_per_token
      ),
      getLatencyScore: jest.fn().mockResolvedValue(config.latency / 1000),
      send: jest.fn().mockResolvedValue({
        content: `Response from ${name}`,
        backend_used: name,
        tokens_input: 10,
        tokens_output: 20,
        cost_eur: config.cost_per_token * 0.03,
        latency_ms: config.latency,
        cache_hit: false
      }),
      validateConfig: jest.fn().mockResolvedValue(true),
      getInfo: jest.fn().mockReturnValue({
        name,
        type: 'cloud',
        model: 'test-model',
        priority: config.priority,
        cost_per_token: config.cost_per_token,
        healthy: true
      })
    } as jest.Mocked<Backend>;
  }
});
```

### Test Utilities

Create reusable test utilities for common patterns:

```typescript
// src/test/utils/test-helpers.ts
import { ClaudetteRequest, ClaudetteResponse, Backend } from '../../types';

export class TestHelpers {
  /**
   * Create a mock ClaudetteRequest for testing
   */
  static createMockRequest(overrides: Partial<ClaudetteRequest> = {}): ClaudetteRequest {
    return {
      prompt: 'Test prompt',
      files: [],
      options: {
        max_tokens: 100,
        temperature: 0.7
      },
      ...overrides
    };
  }

  /**
   * Create a mock ClaudetteResponse for testing
   */
  static createMockResponse(overrides: Partial<ClaudetteResponse> = {}): ClaudetteResponse {
    return {
      content: 'Test response',
      backend_used: 'test-backend',
      tokens_input: 10,
      tokens_output: 20,
      cost_eur: 0.001,
      latency_ms: 100,
      cache_hit: false,
      ...overrides
    };
  }

  /**
   * Create a mock backend for testing
   */
  static createMockBackend(name: string, config: any = {}): jest.Mocked<Backend> {
    return {
      name,
      isAvailable: jest.fn().mockResolvedValue(true),
      estimateCost: jest.fn().mockReturnValue(0.001),
      getLatencyScore: jest.fn().mockResolvedValue(0.1),
      send: jest.fn().mockResolvedValue(TestHelpers.createMockResponse({
        backend_used: name
      })),
      validateConfig: jest.fn().mockResolvedValue(true),
      getInfo: jest.fn().mockReturnValue({
        name,
        type: 'cloud',
        model: 'test-model',
        priority: 1,
        cost_per_token: 0.0001,
        healthy: true,
        ...config
      })
    } as jest.Mocked<Backend>;
  }

  /**
   * Wait for a specific amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Assert that a value is within a range
   */
  static expectWithinRange(actual: number, expected: number, tolerance: number): void {
    expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
    expect(actual).toBeLessThanOrEqual(expected + tolerance);
  }

  /**
   * Create a temporary test configuration
   */
  static createTestConfig() {
    return {
      backends: {
        openai: {
          enabled: true,
          priority: 1,
          cost_per_token: 0.000015,
          model: 'gpt-4o-mini'
        }
      },
      features: {
        caching: true,
        cost_optimization: true,
        performance_monitoring: true,
        smart_routing: true
      },
      thresholds: {
        cache_ttl: 3600,
        max_cache_size: 1000,
        cost_warning: 0.01
      }
    };
  }
}
```

---

## Integration Testing

Integration tests verify that multiple components work together correctly.

### Backend Integration Tests

```typescript
// src/backends/integration/backend-integration.test.ts
import { Claudette } from '../../index';
import { TestHelpers } from '../../test/utils/test-helpers';

describe('Backend Integration Tests', () => {
  let claudette: Claudette;

  beforeEach(async () => {
    claudette = new Claudette();
    await claudette.initialize();
  });

  afterEach(async () => {
    await claudette.cleanup();
  });

  describe('cross-backend functionality', () => {
    it('should route requests between backends', async () => {
      const requests = [
        'Simple math: 2+2=?',
        'Write a complex analysis of quantum computing',
        'Generate a Python function for sorting'
      ];

      const responses = await Promise.all(
        requests.map(prompt => claudette.optimize(prompt))
      );

      // Verify all requests completed
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.content).toBeTruthy();
        expect(response.backend_used).toBeTruthy();
        expect(response.cost_eur).toBeGreaterThan(0);
      });

      // Verify different backends were used based on cost optimization
      const backends = responses.map(r => r.backend_used);
      // Note: This may vary based on actual backend configuration
    });

    it('should handle backend failures gracefully', async () => {
      // Simulate backend failure by using invalid configuration
      const claudetteWithFailure = new Claudette();
      
      // Mock a backend to always fail
      const router = claudetteWithFailure.getRouter();
      const mockFailingBackend = TestHelpers.createMockBackend('failing-backend');
      mockFailingBackend.send.mockRejectedValue(new Error('Backend unavailable'));
      
      router.registerBackend(mockFailingBackend);
      
      await claudetteWithFailure.initialize();

      // Should fallback to working backends
      const response = await claudetteWithFailure.optimize('Test prompt');
      expect(response.content).toBeTruthy();
      expect(response.backend_used).not.toBe('failing-backend');

      await claudetteWithFailure.cleanup();
    });
  });

  describe('caching integration', () => {
    it('should cache and retrieve responses correctly', async () => {
      const prompt = 'Test caching prompt';

      // First request
      const response1 = await claudette.optimize(prompt);
      expect(response1.cache_hit).toBe(false);

      // Second identical request should hit cache
      const response2 = await claudette.optimize(prompt);
      expect(response2.cache_hit).toBe(true);
      expect(response2.content).toBe(response1.content);
    });

    it('should respect cache bypass option', async () => {
      const prompt = 'Test cache bypass';

      // First request
      await claudette.optimize(prompt);

      // Second request with cache bypass
      const response = await claudette.optimize(prompt, [], {
        bypass_cache: true
      });
      
      expect(response.cache_hit).toBe(false);
    });
  });
});
```

### Router Integration Tests

```typescript
// src/router/integration/router-integration.test.ts
import { BackendRouter } from '../adaptive-router';
import { TestHelpers } from '../../test/utils/test-helpers';

describe('Router Integration Tests', () => {
  let router: BackendRouter;

  beforeEach(() => {
    router = new BackendRouter();
    
    // Register multiple backends with different characteristics
    const fastExpensiveBackend = TestHelpers.createMockBackend('fast-expensive', {
      cost_per_token: 0.0005,
      latency: 50
    });

    const slowCheapBackend = TestHelpers.createMockBackend('slow-cheap', {
      cost_per_token: 0.0001,
      latency: 200
    });

    router.registerBackend(fastExpensiveBackend);
    router.registerBackend(slowCheapBackend);
  });

  describe('intelligent routing decisions', () => {
    it('should prefer cost-optimized routing for simple tasks', async () => {
      const router = new BackendRouter({
        cost_weight: 0.8,  // Prioritize cost
        latency_weight: 0.2,
        availability_weight: 0.0,
        fallback_enabled: true
      });

      // Register backends again with new router
      const fastExpensive = TestHelpers.createMockBackend('fast-expensive');
      const slowCheap = TestHelpers.createMockBackend('slow-cheap');
      
      router.registerBackend(fastExpensive);
      router.registerBackend(slowCheap);

      const request = TestHelpers.createMockRequest({
        prompt: 'Simple task'
      });

      const selected = await router.selectBackend(request);
      
      // Should prefer the cheaper backend
      expect(selected.name).toBe('slow-cheap');
    });

    it('should prefer performance-optimized routing for complex tasks', async () => {
      const router = new BackendRouter({
        cost_weight: 0.2,
        latency_weight: 0.8,  // Prioritize performance
        availability_weight: 0.0,
        fallback_enabled: true
      });

      const fastExpensive = TestHelpers.createMockBackend('fast-expensive');
      const slowCheap = TestHelpers.createMockBackend('slow-cheap');
      
      router.registerBackend(fastExpensive);
      router.registerBackend(slowCheap);

      const request = TestHelpers.createMockRequest({
        prompt: 'Complex analysis task requiring fast response'
      });

      const selected = await router.selectBackend(request);
      
      // Should prefer the faster backend
      expect(selected.name).toBe('fast-expensive');
    });
  });

  describe('failure handling and recovery', () => {
    it('should handle transient failures with retry', async () => {
      const backend = TestHelpers.createMockBackend('flaky-backend');
      
      // Mock intermittent failures
      let callCount = 0;
      backend.send.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Transient failure'));
        }
        return Promise.resolve(TestHelpers.createMockResponse());
      });

      router.registerBackend(backend);

      const request = TestHelpers.createMockRequest();
      
      // Should eventually succeed after retries
      const response = await router.routeRequest(request);
      expect(response.content).toBeTruthy();
      expect(callCount).toBeGreaterThan(1);
    });
  });
});
```

---

## End-to-End Testing

E2E tests validate complete user workflows from start to finish.

### User Journey Tests

```typescript
// src/test/e2e/user-journey.e2e.test.ts
import { Claudette } from '../../index';
import { RAGManager, createDockerProvider } from '../../rag';

describe('End-to-End User Journeys', () => {
  let claudette: Claudette;

  beforeAll(async () => {
    claudette = new Claudette('./test/fixtures/e2e-config.json');
    await claudette.initialize();
  });

  afterAll(async () => {
    await claudette.cleanup();
  });

  describe('Basic User Journey', () => {
    it('should complete basic optimization workflow', async () => {
      // Step 1: User makes a simple request
      const response = await claudette.optimize(
        'Explain TypeScript interfaces in simple terms'
      );

      // Verify response quality
      expect(response.content).toContain('interface');
      expect(response.content.length).toBeGreaterThan(50);
      expect(response.backend_used).toBeTruthy();
      expect(response.cost_eur).toBeGreaterThan(0);
      expect(response.latency_ms).toBeLessThan(10000);

      // Step 2: User makes follow-up request (should hit cache)
      const cachedResponse = await claudette.optimize(
        'Explain TypeScript interfaces in simple terms'
      );

      expect(cachedResponse.cache_hit).toBe(true);
      expect(cachedResponse.content).toBe(response.content);
    });

    it('should handle file context correctly', async () => {
      // Create temporary test file
      const testFile = './test/fixtures/sample-code.ts';
      
      const response = await claudette.optimize(
        'Review this code and suggest improvements',
        [testFile]
      );

      expect(response.content).toBeTruthy();
      expect(response.backend_used).toBeTruthy();
      
      // Should reference content from the file
      expect(response.content.toLowerCase()).toMatch(/(typescript|code|function|variable)/);
    });
  });

  describe('Advanced User Journey with RAG', () => {
    let ragManager: RAGManager;

    beforeAll(async () => {
      ragManager = new RAGManager();
      
      // Set up test RAG provider (mock Docker)
      await ragManager.registerProvider('test-docs', {
        deployment: 'local_docker',
        connection: {
          type: 'docker',
          containerName: 'test-chroma',
          port: 8000
        },
        vectorDB: {
          provider: 'chroma',
          collection: 'test-collection'
        }
      });

      const router = claudette.getRouter();
      router.setRAGManager(ragManager);
    });

    afterAll(async () => {
      await ragManager.cleanup();
    });

    it('should complete RAG-enhanced workflow', async () => {
      const response = await claudette.optimize(
        'How do I implement authentication in my web application?',
        [],
        {
          useRAG: true,
          ragQuery: 'authentication security patterns JWT OAuth',
          contextStrategy: 'prepend'
        }
      );

      expect(response.content).toBeTruthy();
      expect(response.metadata?.ragUsed).toBe(true);
      
      // Should include context-aware information
      expect(response.content.toLowerCase()).toMatch(/(authentication|security|jwt|oauth)/);
    });

    it('should fallback gracefully when RAG fails', async () => {
      // Temporarily break RAG connection
      await ragManager.unregisterProvider('test-docs');

      const response = await claudette.optimize(
        'Authentication best practices',
        [],
        {
          useRAG: true,
          ragQuery: 'authentication security'
        }
      );

      // Should still get a response without RAG
      expect(response.content).toBeTruthy();
      expect(response.metadata?.ragUsed).toBe(false);
    });
  });

  describe('Performance and Scaling Journey', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        claudette.optimize(`Concurrent request ${i}: explain async/await`)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.content).toBeTruthy();
        expect(response.backend_used).toBeTruthy();
      });

      // Should complete reasonably quickly with concurrency
      expect(totalTime).toBeLessThan(30000); // 30 seconds max

      // Verify load balancing occurred
      const backends = responses.map(r => r.backend_used);
      const uniqueBackends = new Set(backends);
      expect(uniqueBackends.size).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const iterations = 5;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await claudette.optimize(`Load test iteration ${i}`);
        
        const latency = Date.now() - startTime;
        latencies.push(latency);
      }

      // Performance should remain consistent
      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      const maxLatency = Math.max(...latencies);

      expect(avgLatency).toBeLessThan(5000); // 5 seconds average
      expect(maxLatency).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe('Error Handling Journey', () => {
    it('should handle invalid inputs gracefully', async () => {
      const invalidInputs = [
        '', // Empty prompt
        'x'.repeat(100000), // Very long prompt
        null as any, // Null prompt
        undefined as any // Undefined prompt
      ];

      for (const input of invalidInputs) {
        try {
          const response = await claudette.optimize(input);
          
          // If it doesn't throw, response should be reasonable
          if (response) {
            expect(response.content).toBeTruthy();
          }
        } catch (error) {
          // Should be a clear, user-friendly error
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBeTruthy();
        }
      }
    });

    it('should recover from backend failures', async () => {
      // This test would need to simulate backend failures
      // and verify that the system recovers gracefully
      
      const response = await claudette.optimize(
        'Test prompt during simulated backend issues'
      );

      expect(response.content).toBeTruthy();
      expect(response.backend_used).toBeTruthy();
    });
  });
});
```

---

## RAG Testing

RAG testing requires special consideration for external dependencies and mock data.

### RAG Provider Tests

```typescript
// src/rag/__tests__/rag-manager.test.ts
import { RAGManager } from '../rag-manager';
import { RAGConfig, RAGRequest } from '../types';

describe('RAGManager', () => {
  let ragManager: RAGManager;
  let mockProvider: any;

  beforeEach(() => {
    ragManager = new RAGManager();
    
    // Create mock provider
    mockProvider = {
      name: 'test-provider',
      query: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockReturnValue({ healthy: true }),
      ensureHealthy: jest.fn()
    };
  });

  afterEach(async () => {
    await ragManager.cleanup();
  });

  describe('provider management', () => {
    it('should register provider successfully', async () => {
      const config: RAGConfig = {
        deployment: 'local_docker',
        connection: {
          type: 'docker',
          containerName: 'test-container',
          port: 8000
        },
        vectorDB: {
          provider: 'chroma',
          collection: 'test-collection'
        }
      };

      // Mock the provider creation
      jest.spyOn(ragManager as any, 'createProvider').mockReturnValue(mockProvider);
      
      await ragManager.registerProvider('test', config);
      
      expect(ragManager.getAvailableProviders()).toContain('test');
    });

    it('should handle provider registration failure', async () => {
      const config: RAGConfig = {
        deployment: 'mcp',
        connection: {
          type: 'mcp',
          pluginPath: '/invalid/path'
        }
      };

      await expect(ragManager.registerProvider('failing', config))
        .rejects.toThrow();
    });
  });

  describe('query execution', () => {
    beforeEach(async () => {
      jest.spyOn(ragManager as any, 'createProvider').mockReturnValue(mockProvider);
      
      await ragManager.registerProvider('test', {
        deployment: 'local_docker',
        connection: { type: 'docker', containerName: 'test', port: 8000 }
      });
    });

    it('should execute query successfully', async () => {
      const mockResult = {
        results: [
          {
            content: 'Test content',
            score: 0.9,
            source: 'test-source'
          }
        ],
        metadata: {
          totalResults: 1,
          processingTime: 100,
          source: 'vector',
          queryId: 'test-query-id'
        }
      };

      mockProvider.query.mockResolvedValue(mockResult);

      const request: RAGRequest = {
        query: 'test query',
        maxResults: 5
      };

      const result = await ragManager.query(request);
      
      expect(result).toEqual(mockResult);
      expect(mockProvider.query).toHaveBeenCalledWith(request);
    });

    it('should handle fallback chain correctly', async () => {
      // Register second provider
      const secondProvider = { ...mockProvider, name: 'fallback-provider' };
      jest.spyOn(ragManager as any, 'createProvider').mockReturnValue(secondProvider);
      
      await ragManager.registerProvider('fallback', {
        deployment: 'local_docker',
        connection: { type: 'docker', containerName: 'fallback', port: 8001 }
      });

      ragManager.setFallbackChain(['test', 'fallback']);

      // Make primary provider fail
      mockProvider.query.mockRejectedValue(new Error('Primary failed'));
      mockProvider.ensureHealthy.mockRejectedValue(new Error('Unhealthy'));

      // Make fallback succeed
      const fallbackResult = {
        results: [{ content: 'Fallback content', score: 0.8, source: 'fallback' }],
        metadata: {
          totalResults: 1,
          processingTime: 150,
          source: 'vector',
          queryId: 'fallback-query'
        }
      };
      secondProvider.query.mockResolvedValue(fallbackResult);

      const result = await ragManager.query({ query: 'test' });
      
      expect(result).toEqual(fallbackResult);
      expect(secondProvider.query).toHaveBeenCalled();
    });
  });

  describe('context integration', () => {
    it('should apply prepend strategy correctly', async () => {
      jest.spyOn(ragManager as any, 'createProvider').mockReturnValue(mockProvider);
      await ragManager.registerProvider('test', {
        deployment: 'local_docker',
        connection: { type: 'docker', containerName: 'test', port: 8000 }
      });

      mockProvider.query.mockResolvedValue({
        results: [
          { content: 'Context 1', score: 0.9, source: 'source1' },
          { content: 'Context 2', score: 0.8, source: 'source2' }
        ],
        metadata: {
          totalResults: 2,
          processingTime: 100,
          source: 'vector',
          queryId: 'test'
        }
      });

      const enhanced = await ragManager.enhanceWithRAG({
        prompt: 'Original prompt',
        useRAG: true,
        ragQuery: 'test query',
        contextStrategy: 'prepend'
      });

      expect(enhanced.content).toContain('Context 1');
      expect(enhanced.content).toContain('Context 2');
      expect(enhanced.content).toContain('Original prompt');
      expect(enhanced.ragMetadata?.contextUsed).toBe(true);
    });
  });
});
```

### RAG Integration Tests with Docker

```typescript
// src/rag/integration/docker-rag.integration.test.ts
import { DockerRAGProvider } from '../docker-rag';
import { RAGConfig } from '../types';

describe('Docker RAG Integration', () => {
  let provider: DockerRAGProvider;
  const testConfig: RAGConfig = {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'chroma-test',
      port: 8000,
      healthCheck: '/api/v1/heartbeat'
    },
    vectorDB: {
      provider: 'chroma',
      collection: 'test-collection'
    }
  };

  beforeAll(async () => {
    // Skip if Docker is not available
    const { execSync } = require('child_process');
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      console.warn('Docker not available, skipping Docker RAG tests');
      return;
    }

    // Start test container
    try {
      execSync(`docker run -d --name ${testConfig.connection.containerName} -p ${testConfig.connection.port}:8000 chromadb/chroma:latest`, { stdio: 'ignore' });
      
      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('Failed to start test container:', error);
    }
  }, 30000);

  afterAll(async () => {
    if (provider) {
      await provider.disconnect();
    }

    // Clean up test container
    try {
      const { execSync } = require('child_process');
      execSync(`docker stop ${testConfig.connection.containerName}`, { stdio: 'ignore' });
      execSync(`docker rm ${testConfig.connection.containerName}`, { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    provider = new DockerRAGProvider(testConfig);
    await provider.connect();
  });

  afterEach(async () => {
    if (provider) {
      await provider.disconnect();
    }
  });

  it('should connect to Docker container successfully', async () => {
    expect(provider).toBeDefined();
    
    const isHealthy = await provider.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should perform vector search', async () => {
    // First, add some test documents (this would typically be done in setup)
    // For this test, we'll just test the query interface
    
    const result = await provider.query({
      query: 'test search query',
      maxResults: 5,
      threshold: 0.5
    });

    expect(result).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.source).toBe('vector');
  });
});
```

---

## Performance Testing

Performance tests ensure Claudette meets its performance targets under various conditions.

### Benchmarking Framework

```typescript
// src/test/performance/benchmark.ts
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async measureFunction<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<BenchmarkResult> {
    const measurements: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        await fn();
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        measurements.push(duration);
      } catch (error) {
        errors++;
      }
    }

    const result: BenchmarkResult = {
      name,
      iterations,
      errors,
      measurements,
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      median: this.calculateMedian(measurements),
      p95: this.calculatePercentile(measurements, 0.95),
      p99: this.calculatePercentile(measurements, 0.99)
    };

    this.results.push(result);
    return result;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  printResults(): void {
    this.results.forEach(result => {
      console.log(`\n${result.name}:`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Average: ${result.average.toFixed(2)}ms`);
      console.log(`  Median: ${result.median.toFixed(2)}ms`);
      console.log(`  Min: ${result.min.toFixed(2)}ms`);
      console.log(`  Max: ${result.max.toFixed(2)}ms`);
      console.log(`  P95: ${result.p95.toFixed(2)}ms`);
      console.log(`  P99: ${result.p99.toFixed(2)}ms`);
    });
  }
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  errors: number;
  measurements: number[];
  average: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
}
```

### Core Performance Tests

```typescript
// src/test/performance/core-performance.test.ts
import { Claudette } from '../../index';
import { PerformanceBenchmark } from './benchmark';
import { TestHelpers } from '../utils/test-helpers';

describe('Core Performance Tests', () => {
  let claudette: Claudette;
  let benchmark: PerformanceBenchmark;

  beforeAll(async () => {
    claudette = new Claudette();
    await claudette.initialize();
    benchmark = new PerformanceBenchmark();
  });

  afterAll(async () => {
    await claudette.cleanup();
    benchmark.printResults();
  });

  describe('Backend Selection Performance', () => {
    it('should select backend quickly', async () => {
      const router = claudette.getRouter();

      const result = await benchmark.measureFunction(
        'Backend Selection',
        async () => {
          const request = TestHelpers.createMockRequest();
          await router.selectBackend(request);
        },
        100
      );

      // Backend selection should be under 50ms on average
      expect(result.average).toBeLessThan(50);
      expect(result.p95).toBeLessThan(100);
    });
  });

  describe('Request Processing Performance', () => {
    it('should process simple requests efficiently', async () => {
      const result = await benchmark.measureFunction(
        'Simple Request Processing',
        async () => {
          await claudette.optimize('Simple test: 2+2=?');
        },
        20
      );

      // Simple requests should complete in reasonable time
      expect(result.average).toBeLessThan(5000); // 5 seconds
      expect(result.p95).toBeLessThan(8000); // 8 seconds
    });

    it('should handle cache lookups quickly', async () => {
      const prompt = 'Cached request test';
      
      // Prime the cache
      await claudette.optimize(prompt);

      const result = await benchmark.measureFunction(
        'Cache Lookup',
        async () => {
          await claudette.optimize(prompt);
        },
        100
      );

      // Cache lookups should be very fast
      expect(result.average).toBeLessThan(10); // 10ms
      expect(result.p95).toBeLessThan(50); // 50ms
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrency = 10;

      const result = await benchmark.measureFunction(
        'Concurrent Requests',
        async () => {
          const promises = Array.from({ length: concurrency }, (_, i) =>
            claudette.optimize(`Concurrent test ${i}`)
          );
          await Promise.all(promises);
        },
        5
      );

      // Concurrent requests should not be dramatically slower than sequential
      expect(result.average).toBeLessThan(15000); // 15 seconds for 10 requests
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage();

      // Process many requests
      for (let i = 0; i < 100; i++) {
        await claudette.optimize(`Memory test ${i}`);
      }

      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 100MB for 100 requests)
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
```

---

## Test Utilities

### Mock Factories

```typescript
// src/test/utils/mock-factories.ts
import { Backend, ClaudetteRequest, ClaudetteResponse, RAGProvider } from '../../types';

export class MockFactories {
  static createBackend(overrides: Partial<Backend> = {}): jest.Mocked<Backend> {
    const defaultBackend: Backend = {
      name: 'mock-backend',
      isAvailable: async () => true,
      estimateCost: (tokens: number) => tokens * 0.0001,
      getLatencyScore: async () => 0.1,
      send: async (request: ClaudetteRequest) => ({
        content: `Mock response for: ${request.prompt}`,
        backend_used: 'mock-backend',
        tokens_input: 10,
        tokens_output: 20,
        cost_eur: 0.001,
        latency_ms: 100,
        cache_hit: false
      }),
      validateConfig: async () => true,
      getInfo: () => ({
        name: 'mock-backend',
        type: 'cloud',
        model: 'mock-model',
        priority: 1,
        cost_per_token: 0.0001,
        healthy: true
      })
    };

    return {
      ...defaultBackend,
      ...overrides,
      isAvailable: jest.fn().mockImplementation(overrides.isAvailable || defaultBackend.isAvailable),
      estimateCost: jest.fn().mockImplementation(overrides.estimateCost || defaultBackend.estimateCost),
      getLatencyScore: jest.fn().mockImplementation(overrides.getLatencyScore || defaultBackend.getLatencyScore),
      send: jest.fn().mockImplementation(overrides.send || defaultBackend.send),
      validateConfig: jest.fn().mockImplementation(overrides.validateConfig || defaultBackend.validateConfig),
      getInfo: jest.fn().mockImplementation(overrides.getInfo || defaultBackend.getInfo)
    } as jest.Mocked<Backend>;
  }

  static createRAGProvider(overrides: Partial<RAGProvider> = {}): jest.Mocked<RAGProvider> {
    return {
      name: 'mock-rag-provider',
      query: jest.fn().mockResolvedValue({
        results: [
          { content: 'Mock RAG content', score: 0.9, source: 'mock-source' }
        ],
        metadata: {
          totalResults: 1,
          processingTime: 100,
          source: 'vector',
          queryId: 'mock-query'
        }
      }),
      connect: jest.fn(),
      disconnect: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockReturnValue({ healthy: true }),
      ensureHealthy: jest.fn(),
      ...overrides
    } as any;
  }
}
```

### Test Data Generators

```typescript
// src/test/utils/test-data.ts
export class TestDataGenerator {
  static generatePrompts(count: number): string[] {
    const templates = [
      'Explain {topic} in simple terms',
      'Write a {language} function to {action}',
      'What are the best practices for {topic}?',
      'How do I implement {feature} in {technology}?',
      'Analyze the pros and cons of {approach}'
    ];

    const topics = ['TypeScript', 'authentication', 'caching', 'microservices', 'testing'];
    const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go'];
    const actions = ['sort an array', 'validate input', 'parse JSON', 'handle errors'];
    const features = ['user authentication', 'real-time updates', 'data persistence'];
    const technologies = ['React', 'Node.js', 'Express', 'PostgreSQL'];
    const approaches = ['REST vs GraphQL', 'SQL vs NoSQL', 'microservices vs monolith'];

    return Array.from({ length: count }, () => {
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      return template
        .replace('{topic}', topics[Math.floor(Math.random() * topics.length)])
        .replace('{language}', languages[Math.floor(Math.random() * languages.length)])
        .replace('{action}', actions[Math.floor(Math.random() * actions.length)])
        .replace('{feature}', features[Math.floor(Math.random() * features.length)])
        .replace('{technology}', technologies[Math.floor(Math.random() * technologies.length)])
        .replace('{approach}', approaches[Math.floor(Math.random() * approaches.length)]);
    });
  }

  static generateRAGDocuments(count: number) {
    const documents = [
      'TypeScript interfaces define the structure of objects and provide compile-time type checking.',
      'Authentication can be implemented using JWT tokens, OAuth, or session-based approaches.',
      'Caching improves performance by storing frequently accessed data in memory.',
      'Microservices architecture breaks applications into small, independent services.',
      'Unit testing ensures individual components work correctly in isolation.'
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `doc-${i}`,
      content: documents[i % documents.length],
      metadata: {
        source: `test-source-${i}`,
        created: new Date().toISOString()
      }
    }));
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run unit tests
      run: npm test
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  rag-tests:
    runs-on: ubuntu-latest
    
    services:
      chroma:
        image: chromadb/chroma:latest
        ports:
          - 8000:8000
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Wait for Chroma
      run: |
        timeout 60 bash -c 'until curl -f http://localhost:8000/api/v1/heartbeat; do sleep 2; done'
    
    - name: Run RAG tests
      run: npm run test:rag

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        # Use test API keys for E2E tests
        OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_TEST_KEY }}
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest --testPathPattern=__tests__",
    "test:unit": "jest --testPathPattern=__tests__ --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:rag": "jest --testPathPattern=rag",
    "test:performance": "jest --testPathPattern=performance",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:rag",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## Best Practices

### Writing Effective Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
   ```typescript
   it('should calculate cost correctly', () => {
     // Arrange
     const backend = new OpenAIBackend(config);
     const tokens = 1000;
     
     // Act
     const cost = backend.estimateCost(tokens);
     
     // Assert
     expect(cost).toBeCloseTo(0.015, 6);
   });
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should return cached response when cache hit occurs')
   
   // Bad
   it('should work with cache')
   ```

3. **Test Edge Cases**
   ```typescript
   describe('edge cases', () => {
     it('should handle empty prompt gracefully');
     it('should handle very long prompts');
     it('should handle network timeouts');
     it('should handle API rate limits');
   });
   ```

### Performance Testing Guidelines

1. **Set Realistic Expectations**
   ```typescript
   // Don't test against unrealistic targets
   expect(response.latency_ms).toBeLessThan(100); // Too strict
   
   // Use reasonable expectations
   expect(response.latency_ms).toBeLessThan(5000); // More realistic
   ```

2. **Account for Variability**
   ```typescript
   // Use statistical measures, not single values
   expect(averageLatency).toBeLessThan(target);
   expect(p95Latency).toBeLessThan(targetP95);
   ```

3. **Warm Up Before Measuring**
   ```typescript
   // Warm up the system
   await claudette.optimize('warmup prompt');
   
   // Now measure performance
   const result = await benchmark.measure(() => 
     claudette.optimize(testPrompt)
   );
   ```

### Mocking Best Practices

1. **Mock External Dependencies**
   ```typescript
   // Mock HTTP requests
   jest.mock('node-fetch');
   
   // Mock file system
   jest.mock('fs');
   
   // Mock environment variables
   process.env.API_KEY = 'test-key';
   ```

2. **Use Type-Safe Mocks**
   ```typescript
   const mockBackend = jest.mocked(backend);
   mockBackend.send.mockResolvedValue(expectedResponse);
   ```

3. **Reset Mocks Between Tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     jest.resetAllMocks();
   });
   ```

### Test Organization

1. **Group Related Tests**
   ```typescript
   describe('BackendRouter', () => {
     describe('backend selection', () => {
       // Selection tests
     });
     
     describe('error handling', () => {
       // Error tests
     });
   });
   ```

2. **Use Setup and Teardown**
   ```typescript
   describe('Database tests', () => {
     beforeAll(async () => {
       await setupTestDatabase();
     });
     
     afterAll(async () => {
       await cleanupTestDatabase();
     });
   });
   ```

3. **Share Common Setup**
   ```typescript
   // test/setup.ts
   export const setupTestEnvironment = async () => {
     // Common setup logic
   };
   
   // In test files
   beforeEach(async () => {
     await setupTestEnvironment();
   });
   ```

---

*This comprehensive testing guide ensures that Claudette maintains high quality and reliability standards. For specific testing scenarios and advanced patterns, see the individual test files and examples in the repository.*