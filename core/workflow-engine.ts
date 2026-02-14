/**
 * Workflow Engine
 * Based on the 4-step workflow design from framework diagrams
 *
 * Implements the structured workflow:
 * Step 1: Init Environment (./init.sh → localhost:3000)
 * Step 2: Select Task (from feature_list.json)
 * Step 3: Write Code (implementation)
 * Step 4: Verify (lint → build → browser test → decision loop)
 */

import { FeatureManager } from './feature-manager';
import { ProgressTracker } from './progress-tracker';
import { TestPhase, TestPhaseResult } from './test-phase';

export type WorkflowStep = 1 | 2 | 3 | 4;
export type WorkflowState = 'idle' | 'initializing' | 'selecting' | 'coding' | 'verifying' | 'completed' | 'failed';

export interface WorkflowContext {
  sessionId: string;
  currentStep: WorkflowStep;
  state: WorkflowState;
  currentFeatureId: string | null;
  iterationCount: number;
  maxIterations: number;
  startedAt: Date;
  lastStepCompletedAt: Date | null;
}

export interface StepResult {
  step: WorkflowStep;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  nextAction: 'continue' | 'retry' | 'abort';
}

export interface WorkflowResult {
  success: boolean;
  featureCompleted: boolean;
  featureId: string | null;
  iterations: number;
  steps: StepResult[];
  testResults?: TestPhaseResult;
  totalDuration: number;
}

export class WorkflowEngine {
  private featureManager: FeatureManager;
  private progressTracker: ProgressTracker;
  private testPhase: TestPhase;
  private projectRoot: string;
  private context: WorkflowContext;

  constructor(
    projectRoot: string,
    featureManager: FeatureManager,
    progressTracker: ProgressTracker,
    maxIterations: number = 3
  ) {
    this.projectRoot = projectRoot;
    this.featureManager = featureManager;
    this.progressTracker = progressTracker;
    this.testPhase = new TestPhase(projectRoot);
    this.context = this.createInitialContext();
  }

  private createInitialContext(): WorkflowContext {
    return {
      sessionId: this.generateSessionId(),
      currentStep: 1,
      state: 'idle',
      currentFeatureId: null,
      iterationCount: 0,
      maxIterations: 3,
      startedAt: new Date(),
      lastStepCompletedAt: null
    };
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Execute the complete workflow from Step 1 to Step 4
   */
  async executeWorkflow(): Promise<WorkflowResult> {
    const steps: StepResult[] = [];
    const startTime = Date.now();

    // Step 1: Init Environment
    this.context.state = 'initializing';
    const step1Result = await this.executeStep1();
    steps.push(step1Result);

    if (!step1Result.success) {
      return this.createFailedResult(steps, startTime, 'Step 1 failed: Environment initialization');
    }

    // Step 2: Select Task
    this.context.state = 'selecting';
    const step2Result = await this.executeStep2();
    steps.push(step2Result);

    if (!step2Result.success) {
      return this.createFailedResult(steps, startTime, 'Step 2 failed: No task available');
    }

    // Step 3 & 4: Write Code + Verify (with iteration loop)
    let allPassed = false;
    let iterations = 0;

    while (!allPassed && iterations < this.context.maxIterations) {
      iterations++;
      this.context.iterationCount = iterations;

      // Step 3: Write Code
      this.context.state = 'coding';
      const step3Result = await this.executeStep3(iterations);
      steps.push(step3Result);

      if (!step3Result.success) {
        // If coding failed, we need to retry
        continue;
      }

      // Step 4: Verify (Test Phase)
      this.context.state = 'verifying';
      const step4Result = await this.executeStep4();
      steps.push(step4Result);

      if (step4Result.success) {
        allPassed = true;
        this.context.state = 'completed';
      } else {
        // Test failed - loop back to Step 3
        this.context.state = 'coding';
        // Log iteration for debugging
        console.log(`Iteration ${iterations} failed, retrying...`);
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      success: allPassed,
      featureCompleted: allPassed,
      featureId: this.context.currentFeatureId,
      iterations,
      steps,
      testResults: steps.find(s => s.step === 4 && s.success)?.['testResults'] as TestPhaseResult,
      totalDuration
    };
  }

  /**
   * Step 1: Initialize Environment
   * - Run ./init.sh to start development server
   * - Verify localhost:3000 is accessible
   */
  private async executeStep1(): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Execute init.sh
      const { execSync } = require('child_process');

      // Check if init.sh exists
      const fs = require('fs');
      const initPath = `${this.projectRoot}/init.sh`;

      if (!fs.existsSync(initPath)) {
        return {
          step: 1,
          success: false,
          output: 'init.sh not found',
          error: 'init.sh script does not exist in project root',
          duration: Date.now() - startTime,
          nextAction: 'abort'
        };
      }

      // Make it executable and run
      execSync(`chmod +x ${initPath}`, { stdio: 'inherit' });

      // Run in background and wait for server
      const output = `Executing: ./init.sh\n`;

      // Wait for server to be ready
      const serverReady = await this.waitForServer(3000, 30000);

      if (!serverReady) {
        return {
          step: 1,
          success: false,
          output,
          error: 'Server did not start within timeout',
          duration: Date.now() - startTime,
          nextAction: 'retry'
        };
      }

      this.context.currentStep = 2;
      this.context.lastStepCompletedAt = new Date();

      return {
        step: 1,
        success: true,
        output: `${output}Server running at http://localhost:3000`,
        duration: Date.now() - startTime,
        nextAction: 'continue'
      };
    } catch (error) {
      return {
        step: 1,
        success: false,
        output: '',
        error: String(error),
        duration: Date.now() - startTime,
        nextAction: 'retry'
      };
    }
  }

  /**
   * Step 2: Select Task
   * - Read feature_list.json
   * - Select highest-priority incomplete feature
   */
  private async executeStep2(): Promise<StepResult> {
    const startTime = Date.now();

    try {
      const nextFeature = await this.featureManager.getNextIncompleteFeature();

      if (!nextFeature) {
        return {
          step: 2,
          success: false,
          output: 'No incomplete features found',
          error: 'All features completed or no features defined',
          duration: Date.now() - startTime,
          nextAction: 'abort'
        };
      }

      this.context.currentFeatureId = nextFeature.id;
      this.context.currentStep = 3;
      this.context.lastStepCompletedAt = new Date();

      return {
        step: 2,
        success: true,
        output: `Selected feature: ${nextFeature.id} - ${nextFeature.description}`,
        duration: Date.now() - startTime,
        nextAction: 'continue'
      };
    } catch (error) {
      return {
        step: 2,
        success: false,
        output: '',
        error: String(error),
        duration: Date.now() - startTime,
        nextAction: 'retry'
      };
    }
  }

  /**
   * Step 3: Write Code
   * - Implement the selected feature
   * - This is handled by the agent (not automated)
   */
  private async executeStep3(iteration: number): Promise<StepResult> {
    const startTime = Date.now();

    // This step is primarily informational - the actual coding is done by the agent
    const output = iteration === 1
      ? `Starting implementation of feature: ${this.context.currentFeatureId}`
      : `Retrying implementation (iteration ${iteration}): ${this.context.currentFeatureId}`;

    this.context.currentStep = 4;
    this.context.lastStepCompletedAt = new Date();

    // For now, return success - the agent handles actual implementation
    return {
      step: 3,
      success: true,
      output,
      duration: Date.now() - startTime,
      nextAction: 'continue'
    };
  }

  /**
   * Step 4: Verify (Test Phase)
   * - Run lint check
   * - Run build
   * - Run browser tests
   * - Decision: All passed? → Yes (continue) / No (loop to Step 3)
   */
  private async executeStep4(): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Execute the complete test phase
      const testResults = await this.testPhase.executeTestPhase();

      const allPassed = testResults.allPassed;
      const output = this.formatTestPhaseOutput(testResults);

      if (allPassed) {
        this.context.state = 'completed';
        this.context.lastStepCompletedAt = new Date();

        return {
          step: 4,
          success: true,
          output,
          duration: Date.now() - startTime,
          nextAction: 'continue'
        };
      } else {
        // Not all tests passed - need to loop back
        return {
          step: 4,
          success: false,
          output,
          error: testResults.failedTests.join(', '),
          duration: Date.now() - startTime,
          nextAction: 'retry'
        };
      }
    } catch (error) {
      return {
        step: 4,
        success: false,
        output: '',
        error: String(error),
        duration: Date.now() - startTime,
        nextAction: 'retry'
      };
    }
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServer(port: number, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const http = require('http');
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${port}`, (res: any) => {
            resolve(res);
          });
          req.on('error', reject);
          req.setTimeout(1000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        return true;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  }

  /**
   * Format test phase results for output
   */
  private formatTestPhaseOutput(results: TestPhaseResult): string {
    let output = '=== Test Phase Results ===\n\n';

    output += `Lint: ${results.lint.passed ? 'PASSED' : 'FAILED'}\n`;
    if (results.lint.output) {
      output += `  ${results.lint.output.substring(0, 200)}\n`;
    }

    output += `Build: ${results.build.passed ? 'PASSED' : 'FAILED'}\n`;
    if (results.build.output) {
      output += `  ${results.build.output.substring(0, 200)}\n`;
    }

    output += `Browser Tests: ${results.browserTests.passed ? 'PASSED' : 'FAILED'}\n`;
    if (results.browserTests.output) {
      output += `  ${results.browserTests.output.substring(0, 200)}\n`;
    }

    output += `\nOverall: ${results.allPassed ? 'ALL PASSED' : 'SOME FAILED'}\n`;

    if (results.failedTests.length > 0) {
      output += `\nFailed: ${results.failedTests.join(', ')}\n`;
    }

    return output;
  }

  /**
   * Create a failed workflow result
   */
  private createFailedResult(
    steps: StepResult[],
    startTime: number,
    error: string
  ): WorkflowResult {
    this.context.state = 'failed';

    return {
      success: false,
      featureCompleted: false,
      featureId: this.context.currentFeatureId,
      iterations: this.context.iterationCount,
      steps,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Get current workflow context
   */
  getContext(): WorkflowContext {
    return { ...this.context };
  }

  /**
   * Get workflow state as string
   */
  getStateString(): string {
    const stepNames: Record<WorkflowStep, string> = {
      1: 'Init Environment',
      2: 'Select Task',
      3: 'Write Code',
      4: 'Verify'
    };

    return `Step ${this.context.currentStep}: ${stepNames[this.context.currentStep]} (${this.context.state})`;
  }
}
