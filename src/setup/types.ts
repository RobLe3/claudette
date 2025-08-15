// Setup wizard type definitions

export interface SetupWizardOptions {
  skipWelcome?: boolean;
  quickSetup?: boolean;
  targetTime?: number; // seconds
  allowSkipSteps?: boolean;
  verboseOutput?: boolean;
  validateEverything?: boolean;
}

export interface SetupStep {
  id: string;
  name: string;
  description: string;
  estimatedTime: number; // seconds
  required: boolean;
  dependencies?: string[];
  execute(context: SetupContext): Promise<StepResult>;
  validate?(context: SetupContext): Promise<boolean>;
  cleanup?(context: SetupContext): Promise<void>;
}

export interface StepResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: Error;
  skipped?: boolean;
  warnings?: string[];
  nextSteps?: string[];
  actualTime?: number;
}

export interface SetupProgress {
  currentStep: number;
  totalSteps: number;
  stepId: string;
  stepName: string;
  elapsed: number;
  estimated: number;
  remaining: number;
  percentage: number;
  phase: 'starting' | 'running' | 'validating' | 'completed' | 'failed';
}

export interface SetupContext {
  options: SetupWizardOptions;
  progress: SetupProgress;
  configuration: SetupConfiguration;
  preferences: UserPreferences;
  results: Map<string, StepResult>;
  startTime: number;
}

export interface SetupConfiguration {
  credentials: {
    [backend: string]: {
      apiKey?: string;
      baseURL?: string;
      model?: string;
      enabled: boolean;
    };
  };
  backends: {
    priority: string[];
    fallback: boolean;
    costThreshold?: number;
    latencyThreshold?: number;
  };
  rag: {
    enabled: boolean;
    deployment: 'none' | 'mcp' | 'local_docker' | 'remote_docker';
    connection?: any;
    vectorDB?: any;
    graphDB?: any;
    hybrid?: boolean;
  };
  features: {
    caching: boolean;
    compression: boolean;
    routing: boolean;
    monitoring: boolean;
  };
  advanced?: {
    [key: string]: any;
  };
}

export interface UserPreferences {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryUseCase: 'development' | 'research' | 'production' | 'personal';
  costPriority: 'low' | 'medium' | 'high';
  performancePriority: 'low' | 'medium' | 'high';
  privacyLevel: 'basic' | 'enhanced' | 'strict';
  skipOptional: boolean;
}

export interface BackendDetectionResult {
  name: string;
  available: boolean;
  configured: boolean;
  hasApiKey: boolean;
  healthy: boolean;
  priority?: number;
  costPerToken?: number;
  latency?: number;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  component: string;
  message: string;
  critical: boolean;
  fixSuggestion?: string;
  testResult?: any;
}

export interface SetupMetrics {
  totalTime: number;
  stepTimes: { [stepId: string]: number };
  userInteractionTime: number;
  automatedTime: number;
  errorsEncountered: number;
  warningsEncountered: number;
  stepsCompleted: number;
  stepsSkipped: number;
  successRate: number;
  firstRequestTime?: number;
}

export interface WelcomeInfo {
  version: string;
  estimatedTime: number;
  featuresEnabled: string[];
  requirements: string[];
}

export interface CompletionSummary {
  success: boolean;
  totalTime: number;
  configuredBackends: string[];
  enabledFeatures: string[];
  nextSteps: string[];
  troubleshooting?: string;
  supportInfo?: string;
}