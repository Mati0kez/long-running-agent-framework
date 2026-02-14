/**
 * Agent Coordinator
 * Coordinates between different agent types and manages the overall workflow
 *
 * Based on Anthropic's article about multi-agent architecture potential:
 * "It seems reasonable that specialized agents like a testing agent,
 * a quality assurance agent, or a code cleanup agent, could do an even
 * better job at sub-tasks across the software development lifecycle."
 */

import { SessionManager, AgentType } from './session-manager';
import { FeatureManager } from './feature-manager';
import { ProgressTracker } from './progress-tracker';

export interface AgentConfig {
  type: AgentType;
  priority: number;
  maxConcurrent: number;
  timeoutMs: number;
  requiredCapabilities: string[];
}

export interface CoordinationContext {
  currentPhase: ProjectPhase;
  activeAgents: AgentInfo[];
  pendingTasks: Task[];
  blockedTasks: Task[];
}

export interface AgentInfo {
  sessionId: string;
  type: AgentType;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  lastHeartbeat: Date;
}

export interface Task {
  id: string;
  type: TaskType;
  priority: number;
  featureId?: string;
  dependencies: string[];
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: Date;
}

export type TaskType =
  | 'initialize_project'
  | 'implement_feature'
  | 'write_tests'
  | 'run_tests'
  | 'fix_bug'
  | 'code_review'
  | 'cleanup'
  | 'documentation';

export type ProjectPhase =
  | 'initialization'
  | 'development'
  | 'testing'
  | 'refinement'
  | 'completion';

export class AgentCoordinator {
  private projectRoot: string;
  private sessionManager: SessionManager;
  private featureManager: FeatureManager;
  private progressTracker: ProgressTracker;
  private agentConfigs: Map<AgentType, AgentConfig>;
  private taskQueue: Task[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.sessionManager = new SessionManager(projectRoot);
    this.featureManager = new FeatureManager(projectRoot);
    this.progressTracker = new ProgressTracker(projectRoot);
    this.taskQueue = [];

    this.agentConfigs = this.initializeAgentConfigs();
  }

  /**
   * Initialize default agent configurations
   */
  private initializeAgentConfigs(): Map<AgentType, AgentConfig> {
    return new Map([
      ['initializer', {
        type: 'initializer',
        priority: 100,
        maxConcurrent: 1,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        requiredCapabilities: ['project_setup', 'environment_config']
      }],
      ['coding', {
        type: 'coding',
        priority: 50,
        maxConcurrent: 1, // Typically one coding agent at a time
        timeoutMs: 60 * 60 * 1000, // 1 hour
        requiredCapabilities: ['code_writing', 'debugging', 'testing']
      }],
      ['testing', {
        type: 'testing',
        priority: 60,
        maxConcurrent: 2,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        requiredCapabilities: ['test_writing', 'browser_automation', 'verification']
      }],
      ['cleanup', {
        type: 'cleanup',
        priority: 30,
        maxConcurrent: 1,
        timeoutMs: 15 * 60 * 1000, // 15 minutes
        requiredCapabilities: ['refactoring', 'documentation']
      }]
    ]);
  }

  /**
   * Determine the current project phase
   */
  async determineProjectPhase(): Promise<ProjectPhase> {
    const progress = await this.progressTracker.getCurrentProgress();
    const incompleteFeatures = await this.featureManager.getIncompleteFeatureCount();

    // No sessions yet - initialization phase
    if (progress.totalSessions === 0) {
      return 'initialization';
    }

    // All features complete - completion phase
    if (incompleteFeatures === 0) {
      return 'completion';
    }

    // Recent failures - refinement phase
    if (progress.currentStreak === 0 && progress.totalSessions > 5) {
      return 'refinement';
    }

    // Active development
    return 'development';
  }

  /**
   * Get the coordination context for decision making
   */
  async getCoordinationContext(): Promise<CoordinationContext> {
    const phase = await this.determineProjectPhase();
    const recentSessions = await this.sessionManager.getRecentSessions(5);

    const activeAgents: AgentInfo[] = recentSessions
      .filter(s => s.status === 'running')
      .map(s => ({
        sessionId: s.id,
        type: s.type,
        status: 'working' as const,
        currentTask: s.featureId,
        lastHeartbeat: new Date(s.startTime)
      }));

    const pendingTasks = this.taskQueue.filter(t => t.status === 'pending');
    const blockedTasks = this.taskQueue.filter(t => t.status === 'blocked');

    return {
      currentPhase: phase,
      activeAgents,
      pendingTasks,
      blockedTasks
    };
  }

  /**
   * Determine the next agent type to run based on project state
   */
  async getNextAgentType(): Promise<AgentType> {
    const phase = await this.determineProjectPhase();
    const progress = await this.progressTracker.getCurrentProgress();

    switch (phase) {
      case 'initialization':
        return 'initializer';

      case 'development':
        // Alternate between coding and testing
        const lastSession = progress.recentProgress[0];
        if (lastSession?.agentType === 'coding' && lastSession.testsRun === 0) {
          return 'testing';
        }
        return 'coding';

      case 'refinement':
        // After failures, run testing to identify issues
        return 'testing';

      case 'completion':
        // Final cleanup
        return 'cleanup';

      default:
        return 'coding';
    }
  }

  /**
   * Create tasks for the next agent session
   */
  async createSessionTasks(): Promise<Task[]> {
    const agentType = await this.getNextAgentType();
    const tasks: Task[] = [];

    switch (agentType) {
      case 'initializer':
        tasks.push(this.createTask('initialize_project', 100));
        break;

      case 'coding':
        const nextFeature = await this.featureManager.getNextIncompleteFeature();
        if (nextFeature) {
          tasks.push(this.createTask('implement_feature', 50, nextFeature.id));
          tasks.push(this.createTask('write_tests', 40, nextFeature.id));
        }
        break;

      case 'testing':
        tasks.push(this.createTask('run_tests', 60));
        break;

      case 'cleanup':
        tasks.push(this.createTask('code_review', 30));
        tasks.push(this.createTask('cleanup', 25));
        tasks.push(this.createTask('documentation', 20));
        break;
    }

    this.taskQueue.push(...tasks);
    return tasks;
  }

  /**
   * Create a task
   */
  private createTask(
    type: TaskType,
    priority: number,
    featureId?: string
  ): Task {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      priority,
      featureId,
      dependencies: [],
      status: 'pending',
      createdAt: new Date()
    };
  }

  /**
   * Get the next task to work on
   */
  async getNextTask(): Promise<Task | null> {
    // Sort by priority
    const availableTasks = this.taskQueue
      .filter(t => t.status === 'pending')
      .filter(t => this.areDependenciesMet(t))
      .sort((a, b) => b.priority - a.priority);

    return availableTasks[0] || null;
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: Task): boolean {
    for (const depId of task.dependencies) {
      const dep = this.taskQueue.find(t => t.id === depId);
      if (!dep || dep.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Mark a task as completed
   */
  completeTask(taskId: string): void {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';

      // Unblock dependent tasks
      for (const t of this.taskQueue) {
        if (t.dependencies.includes(taskId) && t.status === 'blocked') {
          t.status = 'pending';
        }
      }
    }
  }

  /**
   * Generate a session prompt based on agent type and context
   */
  async generateSessionPrompt(agentType: AgentType): Promise<string> {
    const progress = await this.progressTracker.getCurrentProgress();
    const feature = await this.featureManager.getNextIncompleteFeature();
    const phase = await this.determineProjectPhase();

    const basePrompt = this.getBasePrompt(agentType);
    const contextSection = this.buildContextSection(progress, phase);
    const taskSection = this.buildTaskSection(agentType, feature);

    return `${basePrompt}

${contextSection}

${taskSection}`;
  }

  /**
   * Get base prompt for agent type
   */
  private getBasePrompt(agentType: AgentType): string {
    const prompts: Record<AgentType, string> = {
      initializer: `You are the Initializer Agent. Your job is to set up the project environment for long-running agent work.

Your responsibilities:
1. Create the init.sh script that can run the development server
2. Generate a comprehensive feature list from the project specification
3. Create the initial git commit with project scaffolding
4. Initialize the progress tracking file

IMPORTANT: Do NOT try to implement all features at once. Your job is ONLY to set up the environment for future agents.`,

      coding: `You are the Coding Agent. Your job is to make incremental progress on ONE feature at a time.

Your responsibilities:
1. Read the progress file and git logs to understand recent work
2. Read the feature list and choose the highest-priority incomplete feature
3. Run init.sh to start the development server
4. Run basic E2E tests to verify the app is working
5. Implement the chosen feature incrementally
6. Test your implementation thoroughly
7. Commit your changes with a descriptive message
8. Update the progress file

CRITICAL RULES:
- Work on ONLY ONE feature per session
- Leave the codebase in a clean state (no bugs, well-documented)
- Test features end-to-end before marking complete
- Use browser automation tools for testing
- NEVER remove or edit existing tests`,

      testing: `You are the Testing Agent. Your job is to verify that features work correctly.

Your responsibilities:
1. Review the feature list for recently completed features
2. Run comprehensive tests on those features
3. Use browser automation to test as a user would
4. Report any bugs or issues found
5. Update feature status based on test results

TESTING REQUIREMENTS:
- All features must be tested end-to-end
- Use browser automation tools (Playwright/Puppeteer)
- Take screenshots to verify visual state
- Test edge cases and error conditions`,

      cleanup: `You are the Cleanup Agent. Your job is to maintain code quality.

Your responsibilities:
1. Review code for potential improvements
2. Add missing documentation
3. Refactor code for clarity
4. Remove dead code
5. Ensure consistent code style

CLEANUP RULES:
- Do not change functionality
- Do not remove working tests
- Document any non-obvious code patterns`
    };

    return prompts[agentType];
  }

  /**
   * Build context section for prompt
   */
  private buildContextSection(
    progress: any,
    phase: ProjectPhase
  ): string {
    return `## Current Context

**Project Phase:** ${phase}
**Total Sessions:** ${progress.totalSessions}
**Features Completed:** ${progress.totalFeaturesCompleted}
**Current Streak:** ${progress.currentStreak} sessions

### Recent Progress
${progress.recentProgress.map((p: any) =>
  `- ${new Date(p.timestamp).toLocaleDateString()}: ${p.summary}`
).join('\n') || 'No recent progress'}
`;
  }

  /**
   * Build task section for prompt
   */
  private buildTaskSection(
    agentType: AgentType,
    feature: any
  ): string {
    if (agentType === 'coding' && feature) {
      return `## Your Task

**Feature to Implement:** ${feature.id}
**Description:** ${feature.description}

### Test Steps
${feature.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

### Startup Checklist
1. Run \`pwd\` to verify working directory
2. Read \`claude-progress.txt\` for recent work
3. Run \`git log --oneline -10\` for recent commits
4. Run \`./init.sh\` to start the development server
5. Run basic E2E tests to verify app is working
6. Begin implementing the feature
`;
    }

    return `## Your Task

Follow the responsibilities outlined above. Start by understanding the current project state.`;
  }
}
