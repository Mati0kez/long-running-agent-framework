/**
 * Long-Running Agent Framework
 * Core module exports
 *
 * Based on Anthropic's "Effective harnesses for long-running agents"
 * https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
 * Reference implementation: https://github.com/anthropics/riv2025-long-horizon-coding-agent-demo
 */

// Core orchestration
export { LongRunningAgentOrchestrator } from './orchestrator';
export { FeatureManager } from './feature-manager';
export { ProgressTracker } from './progress-tracker';
export { SessionManager } from './session-manager';
export { AgentCoordinator } from './agent-coordinator';

// State management (from riv2025 reference)
export { StateManager, VALID_STATES } from './state-manager';
export type { AgentState, AgentPhase, AgentStateData } from './state-manager';

// Test management (from riv2025 reference)
export { TestManager } from './test-manager';
export type {
  TestCase,
  TestSuite,
  TestCategory,
  TestPriority
} from './test-manager';

// Human backlog (from riv2025 reference)
export { BacklogManager } from './backlog-manager';
export type {
  BacklogItem,
  BacklogItemType,
  BacklogPriority,
  BacklogStatus,
  BacklogComment
} from './backlog-manager';

// Workflow Engine (4-step workflow from framework diagrams)
export { WorkflowEngine } from './workflow-engine';
export type {
  WorkflowStep,
  WorkflowState,
  WorkflowContext,
  StepResult,
  WorkflowResult
} from './workflow-engine';

// Test Phase (structured testing from framework diagrams)
export { TestPhase } from './test-phase';
export type {
  TestType,
  TestStatus,
  TestResult,
  TestPhaseResult,
  TestPhaseConfig
} from './test-phase';

// Type exports
export type {
  OrchestratorConfig,
  AgentSession,
  SessionProgress
} from './orchestrator';

export type {
  Feature,
  FeatureCategory,
  FeatureList
} from './feature-manager';

export type {
  ProgressEntry,
  ProgressSnapshot
} from './progress-tracker';

export type {
  Session,
  SessionStatus,
  AgentType
} from './session-manager';

export type {
  CoordinationContext,
  Task,
  TaskType,
  ProjectPhase
} from './agent-coordinator';
