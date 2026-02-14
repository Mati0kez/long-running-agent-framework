/**
 * Test Manager
 * Based on Anthropic's riv2025-long-horizon-coding-agent-demo
 *
 * Manages granular test cases with verification requirements.
 * Tests must be verified individually - bulk modifications are blocked.
 */

import * as fs from 'fs';
import * as path from 'path';

export type TestCategory = 'functional' | 'style' | 'accessibility' | 'performance' | 'security';
export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestCase {
  id: string;
  category: TestCategory;
  description: string;
  steps: string[];
  passes: boolean;
  priority: TestPriority;
  verified_at?: string;
  screenshot_path?: string;
  console_log_path?: string;
  notes?: string;
}

export interface TestSuite {
  version: string;
  created_at: string;
  updated_at: string;
  total_tests: number;
  passed_tests: number;
  tests: TestCase[];
}

const TESTS_FILE_NAME = 'tests.json';
const TESTS_VERSION = '1.0.0';

export class TestManager {
  private projectRoot: string;
  private testsFilePath: string;
  private screenshotDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.testsFilePath = path.join(projectRoot, TESTS_FILE_NAME);
    this.screenshotDir = path.join(projectRoot, 'screenshots');
  }

  /**
   * Initialize tests.json with an empty test suite
   */
  initialize(): TestSuite {
    const suite: TestSuite = {
      version: TESTS_VERSION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_tests: 0,
      passed_tests: 0,
      tests: []
    };

    this.saveSuite(suite);
    return suite;
  }

  /**
   * Load the test suite from tests.json
   */
  loadSuite(): TestSuite {
    if (!fs.existsSync(this.testsFilePath)) {
      return this.initialize();
    }

    try {
      const content = fs.readFileSync(this.testsFilePath, 'utf-8');
      return JSON.parse(content) as TestSuite;
    } catch (error) {
      console.error(`⚠️ Error loading tests.json: ${error}`);
      return this.initialize();
    }
  }

  /**
   * Save test suite to tests.json
   */
  private saveSuite(suite: TestSuite): void {
    suite.updated_at = new Date().toISOString();
    suite.total_tests = suite.tests.length;
    suite.passed_tests = suite.tests.filter(t => t.passes).length;

    const tempPath = `${this.testsFilePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(suite, null, 2));
      fs.renameSync(tempPath, this.testsFilePath);
    } catch (error) {
      console.error(`⚠️ Error saving tests.json: ${error}`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Add a new test case
   */
  addTest(test: Omit<TestCase, 'id' | 'passes'>): TestCase {
    const suite = this.loadSuite();

    const newTest: TestCase = {
      ...test,
      id: this.generateTestId(test.category),
      passes: false
    };

    suite.tests.push(newTest);
    this.saveSuite(suite);

    return newTest;
  }

  /**
   * Add multiple test cases
   */
  addTests(tests: Array<Omit<TestCase, 'id' | 'passes'>>): TestCase[] {
    const suite = this.loadSuite();
    const newTests: TestCase[] = [];

    for (const test of tests) {
      const newTest: TestCase = {
        ...test,
        id: this.generateTestId(test.category),
        passes: false
      };
      newTests.push(newTest);
      suite.tests.push(newTest);
    }

    this.saveSuite(suite);
    return newTests;
  }

  /**
   * Generate a unique test ID
   */
  private generateTestId(category: TestCategory): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${category.substring(0, 3).toUpperCase()}-${timestamp}-${random}`;
  }

  /**
   * Mark a test as passing (requires verification evidence)
   * This is the ONLY way to update test status - bulk modifications blocked
   */
  markTestPassing(
    testId: string,
    evidence: {
      screenshot_path: string;
      console_log_path: string;
      notes?: string;
    }
  ): boolean {
    const suite = this.loadSuite();
    const test = suite.tests.find(t => t.id === testId);

    if (!test) {
      console.error(`⚠️ Test not found: ${testId}`);
      return false;
    }

    // Verify screenshot exists
    if (!fs.existsSync(evidence.screenshot_path)) {
      console.error(`⚠️ Screenshot not found: ${evidence.screenshot_path}`);
      return false;
    }

    // Verify console log exists
    if (!fs.existsSync(evidence.console_log_path)) {
      console.error(`⚠️ Console log not found: ${evidence.console_log_path}`);
      return false;
    }

    // Verify console log shows no errors
    const consoleContent = fs.readFileSync(evidence.console_log_path, 'utf-8');
    if (consoleContent.includes('ERROR') || consoleContent.includes('FAIL')) {
      console.error(`⚠️ Console log contains errors - test cannot pass`);
      return false;
    }

    test.passes = true;
    test.verified_at = new Date().toISOString();
    test.screenshot_path = evidence.screenshot_path;
    test.console_log_path = evidence.console_log_path;
    test.notes = evidence.notes;

    this.saveSuite(suite);
    console.log(`✅ Test ${testId} marked as passing`);
    return true;
  }

  /**
   * Mark a test as failing (reset its status)
   */
  markTestFailing(testId: string, reason?: string): boolean {
    const suite = this.loadSuite();
    const test = suite.tests.find(t => t.id === testId);

    if (!test) {
      console.error(`⚠️ Test not found: ${testId}`);
      return false;
    }

    test.passes = false;
    test.verified_at = undefined;
    test.notes = reason || 'Marked as failing';

    this.saveSuite(suite);
    console.log(`🔄 Test ${testId} marked as failing`);
    return true;
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): TestCase | null {
    const suite = this.loadSuite();
    return suite.tests.find(t => t.id === testId) || null;
  }

  /**
   * Get all failing tests
   */
  getFailingTests(): TestCase[] {
    const suite = this.loadSuite();
    return suite.tests.filter(t => !t.passes);
  }

  /**
   * Get all passing tests
   */
  getPassingTests(): TestCase[] {
    const suite = this.loadSuite();
    return suite.tests.filter(t => t.passes);
  }

  /**
   * Get next test to work on (by priority)
   */
  getNextTest(): TestCase | null {
    const suite = this.loadSuite();
    const failingTests = suite.tests.filter(t => !t.passes);

    if (failingTests.length === 0) {
      return null;
    }

    const priorityOrder: TestPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorityOrder) {
      const test = failingTests.find(t => t.priority === priority);
      if (test) {
        return test;
      }
    }

    return failingTests[0];
  }

  /**
   * Get tests by category
   */
  getTestsByCategory(category: TestCategory): TestCase[] {
    const suite = this.loadSuite();
    return suite.tests.filter(t => t.category === category);
  }

  /**
   * Get progress summary
   */
  getProgressSummary(): {
    total: number;
    passed: number;
    failed: number;
    percentage: number;
    byCategory: Record<TestCategory, { total: number; passed: number }>;
    byPriority: Record<TestPriority, { total: number; passed: number }>;
  } {
    const suite = this.loadSuite();
    const total = suite.tests.length;
    const passed = suite.tests.filter(t => t.passes).length;

    const byCategory: Record<TestCategory, { total: number; passed: number }> = {
      functional: { total: 0, passed: 0 },
      style: { total: 0, passed: 0 },
      accessibility: { total: 0, passed: 0 },
      performance: { total: 0, passed: 0 },
      security: { total: 0, passed: 0 }
    };

    const byPriority: Record<TestPriority, { total: number; passed: number }> = {
      critical: { total: 0, passed: 0 },
      high: { total: 0, passed: 0 },
      medium: { total: 0, passed: 0 },
      low: { total: 0, passed: 0 }
    };

    for (const test of suite.tests) {
      byCategory[test.category].total++;
      if (test.passes) {
        byCategory[test.category].passed++;
      }
      byPriority[test.priority].total++;
      if (test.passes) {
        byPriority[test.priority].passed++;
      }
    }

    return {
      total,
      passed,
      failed: total - passed,
      percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
      byCategory,
      byPriority
    };
  }

  /**
   * Validate test suite integrity
   */
  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const suite = this.loadSuite();

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (const test of suite.tests) {
      if (ids.has(test.id)) {
        issues.push(`Duplicate test ID: ${test.id}`);
      }
      ids.add(test.id);
    }

    // Check for missing required fields
    for (const test of suite.tests) {
      if (!test.description) {
        issues.push(`Test ${test.id} missing description`);
      }
      if (!test.steps || test.steps.length === 0) {
        issues.push(`Test ${test.id} has no steps`);
      }
    }

    // Verify passing tests have evidence
    for (const test of suite.tests.filter(t => t.passes)) {
      if (!test.screenshot_path) {
        issues.push(`Passing test ${test.id} missing screenshot_path`);
      }
      if (!test.console_log_path) {
        issues.push(`Passing test ${test.id} missing console_log_path`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Export test suite as markdown report
   */
  exportReport(): string {
    const suite = this.loadSuite();
    const summary = this.getProgressSummary();

    let report = `# Test Suite Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Tests | ${summary.total} |\n`;
    report += `| Passed | ${summary.passed} |\n`;
    report += `| Failed | ${summary.failed} |\n`;
    report += `| Pass Rate | ${summary.percentage}% |\n\n`;

    report += `## By Category\n\n`;
    report += `| Category | Total | Passed | Pass Rate |\n`;
    report += `|----------|-------|--------|----------|\n`;
    for (const [category, stats] of Object.entries(summary.byCategory)) {
      const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
      report += `| ${category} | ${stats.total} | ${stats.passed} | ${rate}% |\n`;
    }

    report += `\n## Failing Tests\n\n`;
    const failingTests = suite.tests.filter(t => !t.passes);
    if (failingTests.length === 0) {
      report += `All tests passing! 🎉\n`;
    } else {
      for (const test of failingTests) {
        report += `### ${test.id}\n`;
        report += `**Priority:** ${test.priority} | **Category:** ${test.category}\n\n`;
        report += `${test.description}\n\n`;
        report += `**Steps:**\n`;
        for (let i = 0; i < test.steps.length; i++) {
          report += `${i + 1}. ${test.steps[i]}\n`;
        }
        report += `\n`;
      }
    }

    return report;
  }
}
