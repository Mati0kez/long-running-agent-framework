/**
 * Long-Running Agent Orchestrator
 * Based on Anthropic's "Effective harnesses for long-running agents"
 *
 * This framework enables AI agents to work effectively across multiple context windows
 * by maintaining state through structured artifacts (feature lists, progress files, git commits).
 */

import { FeatureManager } from './feature-manager';
import { ProgressTracker } from './progress-tracker';
import { SessionManager } from './session-manager';
import { AgentCoordinator } from './agent-coordinator';

export interface OrchestratorConfig {
  projectRoot: string;
  maxSessionsPerDay: number;
  sessionTimeoutMs: number;
  autoCommit: boolean;
  testingEnabled: boolean;
}

export interface AgentSession {
  id: string;
  type: 'initializer' | 'coding' | 'testing' | 'cleanup';
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  featureId?: string;
  progress: SessionProgress;
}

export interface SessionProgress {
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  commitsMade: number;
  featuresCompleted: string[];
}

export class LongRunningAgentOrchestrator {
  private config: OrchestratorConfig;
  private featureManager: FeatureManager;
  private progressTracker: ProgressTracker;
  private sessionManager: SessionManager;
  private agentCoordinator: AgentCoordinator;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.featureManager = new FeatureManager(config.projectRoot);
    this.progressTracker = new ProgressTracker(config.projectRoot);
    this.sessionManager = new SessionManager(config.projectRoot);
    this.agentCoordinator = new AgentCoordinator(config.projectRoot);
  }

  /**
   * Initialize a new project for long-running agent work
   * This should be called once at the start of a project
   */
  async initializeProject(spec: ProjectSpecification): Promise<InitializationResult> {
    // 1. Create init.sh script for development environment
    await this.createInitScript(spec);

    // 2. Generate comprehensive feature list from spec
    const features = await this.featureManager.generateFeatureList(spec);
    await this.featureManager.saveFeatureList(features);

    // 3. Create initial git commit
    await this.createInitialCommit(spec);

    // 4. Initialize progress tracking
    await this.progressTracker.initialize(spec.name);

    // 5. Create session record
    const session = await this.sessionManager.createSession('initializer');

    return {
      success: true,
      sessionId: session.id,
      featureCount: features.length,
      projectRoot: this.config.projectRoot
    };
  }

  /**
   * Start a new coding session
   * Each session picks up where the last one left off
   */
  async startCodingSession(): Promise<CodingSessionContext> {
    // 1. Get current state
    const currentProgress = await this.progressTracker.getCurrentProgress();
    const nextFeature = await this.featureManager.getNextIncompleteFeature();
    const recentCommits = await this.getRecentCommits(10);

    // 2. Create session
    const session = await this.sessionManager.createSession('coding');
    session.featureId = nextFeature?.id;

    // 3. Build context for the agent
    const context: CodingSessionContext = {
      sessionId: session.id,
      projectRoot: this.config.projectRoot,
      currentProgress,
      nextFeature,
      recentCommits,
      startupChecklist: this.getStartupChecklist(),
      testingInstructions: this.getTestingInstructions()
    };

    return context;
  }

  /**
   * Complete a coding session and save progress
   */
  async completeSession(
    sessionId: string,
    result: SessionResult
  ): Promise<CompletionResult> {
    // 1. Update feature status if completed
    if (result.featureCompleted && result.featureId) {
      await this.featureManager.markFeatureComplete(
        result.featureId,
        result.verificationSteps
      );
    }

    // 2. Record progress
    await this.progressTracker.recordProgress({
      sessionId,
      timestamp: new Date(),
      summary: result.summary,
      filesModified: result.filesModified,
      testsRun: result.testsRun,
      testsPassed: result.testsPassed,
      featureCompleted: result.featureCompleted,
      featureId: result.featureId
    });

    // 3. Create git commit if enabled
    if (this.config.autoCommit && result.commitMessage) {
      await this.createCommit(result.commitMessage, result.filesModified);
    }

    // 4. End session
    await this.sessionManager.endSession(sessionId, result.success ? 'completed' : 'failed');

    // 5. Return next steps
    const nextFeature = await this.featureManager.getNextIncompleteFeature();

    return {
      sessionCompleted: true,
      featureCompleted: result.featureCompleted,
      nextFeature: nextFeature?.id,
      remainingFeatures: await this.featureManager.getIncompleteFeatureCount(),
      projectComplete: !nextFeature
    };
  }

  /**
   * Get the standard startup checklist for a coding session
   */
  private getStartupChecklist(): StartupChecklistItem[] {
    return [
      {
        step: 1,
        action: 'Run pwd to see working directory',
        command: 'pwd',
        purpose: 'Verify correct project directory'
      },
      {
        step: 2,
        action: 'Read progress file and git logs',
        commands: ['cat claude-progress.txt', 'git log --oneline -20'],
        purpose: 'Understand recent work'
      },
      {
        step: 3,
        action: 'Read feature list and choose next feature',
        command: 'cat feature_list.json',
        purpose: 'Identify highest-priority incomplete feature'
      },
      {
        step: 4,
        action: 'Start development server',
        command: './init.sh',
        purpose: 'Ensure app is running for testing'
      },
      {
        step: 5,
        action: 'Run basic E2E tests',
        purpose: 'Verify fundamental functionality works'
      },
      {
        step: 6,
        action: 'Begin work on selected feature',
        purpose: 'Make incremental progress'
      }
    ];
  }

  /**
   * Get testing instructions for the current session
   */
  private getTestingInstructions(): TestingInstructions {
    return {
      requirement: 'All features must be tested end-to-end before marking complete',
      methods: [
        'Use browser automation tools (Playwright/Puppeteer MCP)',
        'Test as a human user would interact with the app',
        'Take screenshots to verify visual state',
        'Verify all steps in feature definition pass'
      ],
      warnings: [
        'It is unacceptable to remove or edit tests',
        'Do not mark features as passing without proper testing',
        'Features relying on browser-native modals need extra attention'
      ]
    };
  }

  private async createInitScript(spec: ProjectSpecification): Promise<void> {
    // Implementation creates init.sh based on project type
  }

  private async createInitialCommit(spec: ProjectSpecification): Promise<void> {
    // Implementation creates initial git commit
  }

  private async getRecentCommits(count: number): Promise<GitCommit[]> {
    // Implementation retrieves recent commits
    return [];
  }

  private async createCommit(message: string, files: string[]): Promise<void> {
    // Implementation creates git commit
  }
}

// Type definitions
interface ProjectSpecification {
  name: string;
  description: string;
  type: 'web-app' | 'api' | 'cli' | 'library';
  features: FeatureSpec[];
  techStack: string[];
}

interface FeatureSpec {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'functional' | 'ui' | 'performance' | 'security';
}

interface InitializationResult {
  success: boolean;
  sessionId: string;
  featureCount: number;
  projectRoot: string;
}

interface CodingSessionContext {
  sessionId: string;
  projectRoot: string;
  currentProgress: ProgressSnapshot;
  nextFeature: Feature | null;
  recentCommits: GitCommit[];
  startupChecklist: StartupChecklistItem[];
  testingInstructions: TestingInstructions;
}

interface SessionResult {
  success: boolean;
  summary: string;
  featureCompleted: boolean;
  featureId?: string;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  commitMessage?: string;
  verificationSteps?: VerificationStep[];
}

interface CompletionResult {
  sessionCompleted: boolean;
  featureCompleted: boolean;
  nextFeature?: string;
  remainingFeatures: number;
  projectComplete: boolean;
}

interface StartupChecklistItem {
  step: number;
  action: string;
  command?: string;
  commands?: string[];
  purpose: string;
}

interface TestingInstructions {
  requirement: string;
  methods: string[];
  warnings: string[];
}

interface ProgressSnapshot {
  totalFeatures: number;
  completedFeatures: number;
  currentStreak: number;
  lastSessionDate: Date;
}

interface Feature {
  id: string;
  description: string;
  category: string;
  steps: string[];
  passes: boolean;
  priority: number;
}

interface GitCommit {
  hash: string;
  message: string;
  date: Date;
  author: string;
}

interface VerificationStep {
  step: string;
  passed: boolean;
  evidence?: string;
}
