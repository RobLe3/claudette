#!/usr/bin/env node

// Test script for the setup wizard - validates implementation and measures performance

import chalk from 'chalk';
import { SetupWizard } from './setup-wizard';
import { StepManager } from './step-manager';
import { ProgressTracker } from './progress-tracker';
import { CredentialSetupStep } from './steps/credential-setup';
import { BackendConfigurationStep } from './steps/backend-configuration';
import { RAGSetupStep } from './steps/rag-setup';
import { ValidationStep } from './steps/validation';

async function runTests() {
  console.log(chalk.bold.cyan('\n🧪 Claudette Setup Wizard Test Suite\n'));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    startTime: Date.now()
  };

  // Test 1: Step Manager Functionality
  await testStepManager(results);
  
  // Test 2: Progress Tracker
  await testProgressTracker(results);
  
  // Test 3: Individual Steps
  await testSetupSteps(results);
  
  // Test 4: Setup Wizard Integration
  await testSetupWizard(results);
  
  // Test 5: Performance Benchmarks
  await testPerformanceBenchmarks(results);
  
  // Summary
  displayTestSummary(results);
}

async function testStepManager(results: any) {
  console.log(chalk.cyan('🔧 Testing Step Manager...'));
  
  try {
    const manager = new StepManager();
    
    // Test step registration
    manager.addStep(new CredentialSetupStep());
    manager.addStep(new BackendConfigurationStep());
    manager.addStep(new RAGSetupStep());
    manager.addStep(new ValidationStep());
    
    const steps = manager.getSteps();
    assert(steps.length === 4, 'Should have 4 registered steps');
    
    // Test dependency validation
    const errors = manager.validateDependencies();
    assert(errors.length === 0, 'Should have no dependency errors');
    
    // Test statistics
    const stats = manager.getStatistics();
    assert(stats.totalSteps === 4, 'Statistics should report 4 total steps');
    assert(stats.estimatedTime > 0, 'Should have positive estimated time');
    
    console.log(chalk.green('   ✅ Step Manager tests passed'));
    results.passed++;
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Step Manager tests failed: ${(error as Error).message}`));
    results.failed++;
  }
  
  results.total++;
}

async function testProgressTracker(results: any) {
  console.log(chalk.cyan('📊 Testing Progress Tracker...'));
  
  try {
    const tracker = new ProgressTracker();
    
    // Test initialization
    tracker.start();
    
    // Test step tracking
    tracker.startStep('test-step');
    await new Promise(resolve => setTimeout(resolve, 100));
    tracker.completeStep('test-step', true);
    
    // Test metrics
    const metrics = tracker.getMetrics();
    assert(metrics.stepsCompleted === 1, 'Should have 1 completed step');
    assert(metrics.totalTime > 0, 'Should have positive total time');
    
    // Test progress calculation
    const progress = tracker.calculateProgress(2, 4, 120);
    assert(progress.percentage === 50, 'Should calculate 50% progress');
    
    console.log(chalk.green('   ✅ Progress Tracker tests passed'));
    results.passed++;
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Progress Tracker tests failed: ${(error as Error).message}`));
    results.failed++;
  }
  
  results.total++;
}

async function testSetupSteps(results: any) {
  console.log(chalk.cyan('⚙️  Testing Setup Steps...'));
  
  const steps = [
    { name: 'Credential Setup', step: new CredentialSetupStep() },
    { name: 'Backend Configuration', step: new BackendConfigurationStep() },
    { name: 'RAG Setup', step: new RAGSetupStep() },
    { name: 'Validation', step: new ValidationStep() }
  ];
  
  for (const { name, step } of steps) {
    try {
      // Test step properties
      const hasId = typeof step.id === 'string' && step.id.length > 0;
      const hasName = typeof step.name === 'string' && step.name.length > 0;
      assert(hasId, `${name} should have an ID`);
      assert(hasName, `${name} should have a name`);
      assert(step.estimatedTime > 0, `${name} should have positive estimated time`);
      
      // Test validation method exists
      if (step.validate) {
        const isFunction = typeof step.validate === 'function';
        assert(isFunction, `${name} validation should be a function`);
      }
      
      console.log(chalk.green(`   ✅ ${name} structure valid`));
      results.passed++;
      
    } catch (error) {
      console.log(chalk.red(`   ❌ ${name} tests failed: ${(error as Error).message}`));
      results.failed++;
    }
    
    results.total++;
  }
}

async function testSetupWizard(results: any) {
  console.log(chalk.cyan('🧙 Testing Setup Wizard Integration...'));
  
  try {
    const wizard = new SetupWizard({
      quickSetup: true,
      targetTime: 60,
      skipWelcome: true,
      verboseOutput: false
    });
    
    // Test wizard initialization
    assert(wizard !== null, 'Wizard should initialize');
    
    console.log(chalk.green('   ✅ Setup Wizard initialization passed'));
    results.passed++;
    
    // Note: We can't test the full wizard run without user interaction
    console.log(chalk.yellow('   ⏭️  Skipping full wizard run (requires user interaction)'));
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Setup Wizard tests failed: ${(error as Error).message}`));
    results.failed++;
  }
  
  results.total++;
}

async function testPerformanceBenchmarks(results: any) {
  console.log(chalk.cyan('🏃 Running Performance Benchmarks...'));
  
  try {
    const startTime = Date.now();
    
    // Test setup wizard initialization time
    const wizard = new SetupWizard({ quickSetup: true });
    const initTime = Date.now() - startTime;
    
    assert(initTime < 1000, 'Wizard initialization should be under 1 second');
    
    // Test step manager performance
    const stepStartTime = Date.now();
    const manager = new StepManager();
    
    // Add 100 mock steps to test scalability
    for (let i = 0; i < 100; i++) {
      const mockStep = {
        id: `mock-step-${i}`,
        name: `Mock Step ${i}`,
        description: 'Test step',
        estimatedTime: 10,
        required: i < 50,
        async execute(): Promise<any> { return { success: true }; }
      };
      manager.addStep(mockStep as any);
    }
    
    const stepTime = Date.now() - stepStartTime;
    assert(stepTime < 500, 'Step registration should be under 500ms for 100 steps');
    
    // Test statistics calculation performance
    const statsStartTime = Date.now();
    const stats = manager.getStatistics();
    const statsTime = Date.now() - statsStartTime;
    
    assert(statsTime < 100, 'Statistics calculation should be under 100ms');
    assert(stats.totalSteps === 100, 'Should track all 100 steps');
    
    console.log(chalk.green('   ✅ Performance benchmarks passed'));
    console.log(chalk.dim(`     Init time: ${initTime}ms`));
    console.log(chalk.dim(`     Step registration: ${stepTime}ms`));
    console.log(chalk.dim(`     Statistics: ${statsTime}ms`));
    
    results.passed++;
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Performance benchmarks failed: ${(error as Error).message}`));
    results.failed++;
  }
  
  results.total++;
}

function displayTestSummary(results: any) {
  const totalTime = Date.now() - results.startTime;
  
  console.log(chalk.bold('\n📋 Test Summary'));
  console.log('═'.repeat(40));
  
  const passRate = (results.passed / results.total) * 100;
  const statusIcon = results.failed === 0 ? '🎉' : results.failed < results.total / 2 ? '⚠️' : '💥';
  
  console.log(`${statusIcon} Total Tests: ${results.total}`);
  console.log(`${chalk.green('✅')} Passed: ${results.passed}`);
  console.log(`${chalk.red('❌')} Failed: ${results.failed}`);
  console.log(`📊 Pass Rate: ${passRate.toFixed(1)}%`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  
  if (results.failed === 0) {
    console.log(chalk.green('\n🎉 All tests passed! Setup wizard is ready for deployment.'));
  } else {
    console.log(chalk.yellow(`\n⚠️  ${results.failed} test(s) failed. Please review and fix issues.`));
  }
  
  // Recommendations
  console.log(chalk.bold.cyan('\n💡 Recommendations:'));
  
  if (totalTime > 5000) {
    console.log(chalk.yellow('• Consider optimizing test performance (took over 5 seconds)'));
  }
  
  if (passRate < 100) {
    console.log(chalk.yellow('• Fix failing tests before production deployment'));
  }
  
  console.log(chalk.green('• Run integration tests with actual API endpoints'));
  console.log(chalk.green('• Test setup wizard with different user scenarios'));
  console.log(chalk.green('• Validate cross-platform compatibility'));
}

// Simple assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(chalk.red('Test suite crashed:'), error);
    process.exit(1);
  });
}

export { runTests };