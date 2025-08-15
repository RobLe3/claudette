// Step management system for setup wizard

import { SetupStep, SetupContext, StepResult } from './types';

export class StepManager {
  private steps: Map<string, SetupStep> = new Map();
  private executionOrder: string[] = [];

  /**
   * Add a step to the wizard
   */
  addStep(step: SetupStep): void {
    if (this.steps.has(step.id)) {
      throw new Error(`Step with id '${step.id}' already exists`);
    }

    this.steps.set(step.id, step);
    this.executionOrder.push(step.id);
  }

  /**
   * Remove a step from the wizard
   */
  removeStep(stepId: string): boolean {
    const removed = this.steps.delete(stepId);
    if (removed) {
      const index = this.executionOrder.indexOf(stepId);
      if (index > -1) {
        this.executionOrder.splice(index, 1);
      }
    }
    return removed;
  }

  /**
   * Get all steps in execution order
   */
  getSteps(): SetupStep[] {
    return this.executionOrder.map(id => this.steps.get(id)!).filter(Boolean);
  }

  /**
   * Get a specific step by id
   */
  getStep(stepId: string): SetupStep | undefined {
    return this.steps.get(stepId);
  }

  /**
   * Reorder steps (useful for customizing setup flow)
   */
  reorderSteps(newOrder: string[]): void {
    // Validate all step ids exist
    for (const stepId of newOrder) {
      if (!this.steps.has(stepId)) {
        throw new Error(`Step '${stepId}' does not exist`);
      }
    }

    // Ensure all existing steps are included
    if (newOrder.length !== this.steps.size) {
      throw new Error('New order must include all existing steps');
    }

    this.executionOrder = [...newOrder];
  }

  /**
   * Get steps that can run in parallel (no dependencies)
   */
  getParallelSteps(): SetupStep[][] {
    const steps = this.getSteps();
    const groups: SetupStep[][] = [];
    const processed = new Set<string>();

    for (const step of steps) {
      if (processed.has(step.id)) {
        continue;
      }

      // Check if dependencies are satisfied
      const canRun = !step.dependencies?.length || 
        step.dependencies.every(dep => processed.has(dep));

      if (canRun) {
        const parallelGroup = [step];
        processed.add(step.id);

        // Find other steps that can run in parallel
        for (const otherStep of steps) {
          if (processed.has(otherStep.id)) {
            continue;
          }

          const otherCanRun = !otherStep.dependencies?.length || 
            otherStep.dependencies.every(dep => processed.has(dep));

          // Check if there are no conflicts
          if (otherCanRun && !this.hasConflicts(step, otherStep)) {
            parallelGroup.push(otherStep);
            processed.add(otherStep.id);
          }
        }

        groups.push(parallelGroup);
      }
    }

    return groups;
  }

  /**
   * Validate step dependencies
   */
  validateDependencies(): string[] {
    const errors: string[] = [];
    const stepIds = new Set(this.steps.keys());

    for (const step of this.steps.values()) {
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            errors.push(`Step '${step.id}' depends on non-existent step '${dep}'`);
          }
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    errors.push(...circularDeps);

    return errors;
  }

  /**
   * Get total estimated time for all steps
   */
  getTotalEstimatedTime(): number {
    return this.getSteps().reduce((total, step) => total + step.estimatedTime, 0);
  }

  /**
   * Get required steps only
   */
  getRequiredSteps(): SetupStep[] {
    return this.getSteps().filter(step => step.required);
  }

  /**
   * Get optional steps only
   */
  getOptionalSteps(): SetupStep[] {
    return this.getSteps().filter(step => !step.required);
  }

  /**
   * Clone the step manager (useful for testing different configurations)
   */
  clone(): StepManager {
    const cloned = new StepManager();
    for (const [id, step] of this.steps) {
      cloned.steps.set(id, step);
    }
    cloned.executionOrder = [...this.executionOrder];
    return cloned;
  }

  /**
   * Get setup statistics
   */
  getStatistics(): {
    totalSteps: number;
    requiredSteps: number;
    optionalSteps: number;
    estimatedTime: number;
    hasDependencies: boolean;
    dependencyChains: number;
  } {
    const steps = this.getSteps();
    const requiredSteps = steps.filter(s => s.required).length;
    const hasDeps = steps.some(s => s.dependencies?.length);
    
    return {
      totalSteps: steps.length,
      requiredSteps,
      optionalSteps: steps.length - requiredSteps,
      estimatedTime: this.getTotalEstimatedTime(),
      hasDependencies: hasDeps,
      dependencyChains: this.countDependencyChains()
    };
  }

  /**
   * Check if two steps have conflicts (can't run in parallel)
   */
  private hasConflicts(step1: SetupStep, step2: SetupStep): boolean {
    // Simple heuristic: steps that modify the same resource type can't run in parallel
    const conflictTypes = [
      ['credential', 'backend'],  // credential and backend steps might conflict
      ['rag', 'database'],        // rag and database setup might conflict
    ];

    for (const [type1, type2] of conflictTypes) {
      if ((step1.id.includes(type1) && step2.id.includes(type2)) ||
          (step1.id.includes(type2) && step2.id.includes(type1))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(): string[] {
    const errors: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (stepId: string, path: string[]): void => {
      if (visiting.has(stepId)) {
        const cycle = path.slice(path.indexOf(stepId));
        errors.push(`Circular dependency detected: ${cycle.join(' -> ')} -> ${stepId}`);
        return;
      }

      if (visited.has(stepId)) {
        return;
      }

      visiting.add(stepId);
      const step = this.steps.get(stepId);
      
      if (step?.dependencies) {
        for (const dep of step.dependencies) {
          visit(dep, [...path, stepId]);
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);
    };

    for (const stepId of this.steps.keys()) {
      if (!visited.has(stepId)) {
        visit(stepId, []);
      }
    }

    return errors;
  }

  /**
   * Count the number of dependency chains
   */
  private countDependencyChains(): number {
    const steps = this.getSteps();
    const roots = steps.filter(s => !s.dependencies?.length);
    let chains = 0;

    const countChain = (stepId: string, visited: Set<string>): void => {
      if (visited.has(stepId)) {
        return;
      }
      visited.add(stepId);

      const dependents = steps.filter(s => s.dependencies?.includes(stepId));
      if (dependents.length === 0) {
        chains++;
      } else {
        for (const dependent of dependents) {
          countChain(dependent.id, new Set(visited));
        }
      }
    };

    for (const root of roots) {
      countChain(root.id, new Set());
    }

    return chains;
  }
}