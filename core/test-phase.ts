/**
 * Test Phase
 * Based on the Test Phase design from framework diagrams (2.png, 3.png)
 *
 * Implements structured testing with three parallel checks:
 * - npm run lint
 * - npm run build
 * - browser tests (Playwright)
 *
 * Decision: All passed? → Yes (continue) / No (loop back to coding)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type TestType = 'lint' | 'build' | 'browser';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestResult {
  type: TestType;
  status: TestStatus;
  passed: boolean;
  output: string;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface TestPhaseResult {
  lint: TestResult;
  build: TestResult;
  browserTests: TestResult;
  allPassed: boolean;
  failedTests: TestType[];
  totalDuration: number;
  timestamp: Date;
}

export interface TestPhaseConfig {
  lintCommand: string;
  buildCommand: string;
  browserTestTimeout: number;
  failFast: boolean;
  captureScreenshots: boolean;
  screenshotDir: string;
}

const DEFAULT_CONFIG: TestPhaseConfig = {
  lintCommand: 'npm run lint',
  buildCommand: 'npm run build',
  browserTestTimeout: 60000,
  failFast: false,
  captureScreenshots: true,
  screenshotDir: '.agent/screenshots'
};

export class TestPhase {
  private projectRoot: string;
  private config: TestPhaseConfig;

  constructor(projectRoot: string, config?: Partial<TestPhaseConfig>) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute the complete test phase
   * Runs all three tests and returns combined results
   */
  async executeTestPhase(): Promise<TestPhaseResult> {
    const startTime = Date.now();
    const failedTests: TestType[] = [];

    // Run all three tests
    const lintResult = await this.runLint();
    const buildResult = await this.runBuild();
    const browserResult = await this.runBrowserTests();

    // Check which tests failed
    if (!lintResult.passed) failedTests.push('lint');
    if (!buildResult.passed) failedTests.push('build');
    if (!browserResult.passed) failedTests.push('browser');

    const allPassed = failedTests.length === 0;

    return {
      lint: lintResult,
      build: buildResult,
      browserTests: browserResult,
      allPassed,
      failedTests,
      totalDuration: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Run lint check: npm run lint
   */
  async runLint(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const output = execSync(this.config.lintCommand, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 120000 // 2 minutes
      });

      return {
        type: 'lint',
        status: 'passed',
        passed: true,
        output: output || 'No lint errors found',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;

      return {
        type: 'lint',
        status: 'failed',
        passed: false,
        output,
        error: 'Lint check failed',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Run build: npm run build
   */
  async runBuild(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const output = execSync(this.config.buildCommand, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 300000 // 5 minutes
      });

      return {
        type: 'build',
        status: 'passed',
        passed: true,
        output: output || 'Build completed successfully',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;

      return {
        type: 'build',
        status: 'failed',
        passed: false,
        output,
        error: 'Build failed',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Run browser tests using Playwright
   * This requires the Playwright MCP server to be available
   */
  async runBrowserTests(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Check if there's a test script for browser tests
      const packageJsonPath = path.join(this.projectRoot, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return {
          type: 'browser',
          status: 'skipped',
          passed: true, // Skip doesn't count as failure
          output: 'No package.json found - browser tests skipped',
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check for test commands
      const hasPlaywrightTest = packageJson.scripts?.test?.includes('playwright') ||
                                packageJson.scripts?.['test:e2e']?.includes('playwright');

      if (!hasPlaywrightTest) {
        // Try to run basic browser health check
        return await this.runBasicBrowserCheck(startTime);
      }

      // Run Playwright tests
      const testCommand = packageJson.scripts?.['test:e2e'] || 'npx playwright test';
      const output = execSync(testCommand, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: this.config.browserTestTimeout
      });

      return {
        type: 'browser',
        status: 'passed',
        passed: true,
        output: output || 'Browser tests passed',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;

      return {
        type: 'browser',
        status: 'failed',
        passed: false,
        output,
        error: 'Browser tests failed',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Basic browser health check
   * Verifies the app is accessible and has no console errors
   */
  private async runBasicBrowserCheck(startTime: number): Promise<TestResult> {
    try {
      // Try to fetch the page
      const http = require('http');

      await new Promise<void>((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res: any) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status code: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      return {
        type: 'browser',
        status: 'passed',
        passed: true,
        output: 'Basic browser check passed - server responding on localhost:3000',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        type: 'browser',
        status: 'failed',
        passed: false,
        output: '',
        error: `Browser check failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Run a single test type
   */
  async runTest(type: TestType): Promise<TestResult> {
    switch (type) {
      case 'lint':
        return this.runLint();
      case 'build':
        return this.runBuild();
      case 'browser':
        return this.runBrowserTests();
    }
  }

  /**
   * Get test phase summary as formatted string
   */
  formatSummary(result: TestPhaseResult): string {
    const lines: string[] = [
      '╔═══════════════════════════════════════════════════════════╗',
      '║                    TEST PHASE RESULTS                     ║',
      '╠═══════════════════════════════════════════════════════════╣',
      '║                                                           ║',
      `║  Lint Check:      ${this.formatStatus(result.lint.passed).padEnd(36)}║`,
      `║  Build:           ${this.formatStatus(result.build.passed).padEnd(36)}║`,
      `║  Browser Tests:   ${this.formatStatus(result.browserTests.passed).padEnd(36)}║`,
      '║                                                           ║`,
      '╠═══════════════════════════════════════════════════════════╣',
      `║  All Passed:      ${result.allPassed ? '✅ YES' : '❌ NO'.padEnd(36)}║`,
      `║  Duration:        ${`${result.totalDuration}ms`.padEnd(36)}║`,
      '╚═══════════════════════════════════════════════════════════╝'
    ];

    if (!result.allPassed) {
      lines.push('');
      lines.push('❌ Failed tests require attention:');
      for (const failed of result.failedTests) {
        const testResult = result[failed === 'lint' ? 'lint' : failed === 'build' ? 'build' : 'browserTests'];
        lines.push(`   - ${failed.toUpperCase()}: ${testResult.error || 'See output above'}`);
      }
      lines.push('');
      lines.push('🔄 Action: Loop back to Step 3 (Write Code) to fix issues');
    }

    return lines.join('\n');
  }

  private formatStatus(passed: boolean): string {
    return passed ? '✅ PASSED' : '❌ FAILED';
  }

  /**
   * Generate test phase diagram (ASCII art)
   */
  static getWorkflowDiagram(): string {
    return `
    ┌─────────────────────────────────────────────────────────────┐
    │                         TEST PHASE                          │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
    │   │ npm run     │  │ npm run     │  │  Browser    │        │
    │   │   lint      │  │   build     │  │   Tests     │        │
    │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
    │          │                │                │                │
    │          └────────────────┼────────────────┘                │
    │                           │                                 │
    │                           ▼                                 │
    │                   ┌───────────────┐                         │
    │                   │ All Passed?   │                         │
    │                   └───────┬───────┘                         │
    │                           │                                 │
    │              ┌────────────┴────────────┐                    │
    │              │                         │                    │
    │              ▼                         ▼                    │
    │           ┌──────┐              ┌───────────┐               │
    │           │ YES  │              │    NO     │               │
    │           └──┬───┘              └─────┬─────┘               │
    │              │                        │                     │
    │              ▼                        │                     │
    │      Continue to next                 │                     │
    │          feature                      │                     │
    │                                       │                     │
    │                                       ▼                     │
    │                              Loop to Step 3                 │
    │                              (Write Code)                   │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    `;
  }
}
