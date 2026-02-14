/**
 * Progress Tracker
 * Manages the progress file (claude-progress.txt) that bridges sessions
 *
 * Key insight from Anthropic article:
 * "The key insight here was finding a way for agents to quickly understand
 * the state of work when starting with a fresh context window, which is
 * accomplished with the claude-progress.txt file alongside the git history."
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProgressEntry {
  timestamp: Date;
  sessionId: string;
  agentType: 'initializer' | 'coding' | 'testing' | 'cleanup';
  summary: string;
  featureWorkedOn?: string;
  featureCompleted?: boolean;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  issuesEncountered?: string[];
  nextSteps?: string[];
}

export interface ProgressSnapshot {
  totalSessions: number;
  totalFeaturesCompleted: number;
  currentStreak: number;
  lastSessionDate: Date | null;
  recentProgress: ProgressEntry[];
  blockedIssues: string[];
}

export class ProgressTracker {
  private projectRoot: string;
  private progressFilePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.progressFilePath = path.join(projectRoot, 'claude-progress.txt');
  }

  /**
   * Initialize the progress file for a new project
   */
  async initialize(projectName: string): Promise<void> {
    const header = this.generateHeader(projectName);
    await fs.promises.writeFile(this.progressFilePath, header, 'utf-8');
  }

  /**
   * Generate the progress file header
   */
  private generateHeader(projectName: string): string {
    const now = new Date().toISOString();
    return `# Progress Log: ${projectName}

This file tracks the progress of long-running agent sessions.
Each session adds an entry to help the next session understand what was done.

Created: ${now}
================================================================================

## SESSION LOG

`;
  }

  /**
   * Record progress from a completed session
   */
  async recordProgress(entry: ProgressEntry): Promise<void> {
    const entryText = this.formatProgressEntry(entry);
    await fs.promises.appendFile(this.progressFilePath, entryText, 'utf-8');
  }

  /**
   * Format a progress entry for the log file
   */
  private formatProgressEntry(entry: ProgressEntry): string {
    const lines: string[] = [];
    const timestamp = new Date(entry.timestamp).toISOString();

    lines.push(`### Session: ${entry.sessionId}`);
    lines.push(`**Time:** ${timestamp}`);
    lines.push(`**Agent Type:** ${entry.agentType}`);
    lines.push('');

    lines.push(`**Summary:** ${entry.summary}`);
    lines.push('');

    if (entry.featureWorkedOn) {
      lines.push(`**Feature:** ${entry.featureWorkedOn}`);
      if (entry.featureCompleted !== undefined) {
        lines.push(`**Status:** ${entry.featureCompleted ? '✅ Completed' : '🔄 In Progress'}`);
      }
      lines.push('');
    }

    if (entry.filesModified.length > 0) {
      lines.push(`**Files Modified:** ${entry.filesModified.length}`);
      for (const file of entry.filesModified) {
        lines.push(`  - ${file}`);
      }
      lines.push('');
    }

    if (entry.testsRun > 0) {
      const passRate = Math.round((entry.testsPassed / entry.testsRun) * 100);
      lines.push(`**Tests:** ${entry.testsPassed}/${entry.testsRun} passed (${passRate}%)`);
      lines.push('');
    }

    if (entry.issuesEncountered && entry.issuesEncountered.length > 0) {
      lines.push('**Issues Encountered:**');
      for (const issue of entry.issuesEncountered) {
        lines.push(`  - ⚠️ ${issue}`);
      }
      lines.push('');
    }

    if (entry.nextSteps && entry.nextSteps.length > 0) {
      lines.push('**Next Steps:**');
      for (const step of entry.nextSteps) {
        lines.push(`  - ${step}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get current progress snapshot
   * This is what a new session reads to understand the state
   */
  async getCurrentProgress(): Promise<ProgressSnapshot> {
    const content = await this.readProgressFile();
    const entries = this.parseProgressEntries(content);

    const completedFeatures = entries.filter(e => e.featureCompleted).length;
    const recentProgress = entries.slice(-5);
    const lastSession = entries.length > 0 ? entries[entries.length - 1] : null;

    // Calculate streak (consecutive sessions with progress)
    let streak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].featureCompleted || entries[i].testsPassed > 0) {
        streak++;
      } else {
        break;
      }
    }

    // Collect blocked issues
    const blockedIssues: string[] = [];
    for (const entry of entries) {
      if (entry.issuesEncountered) {
        blockedIssues.push(...entry.issuesEncountered);
      }
    }

    return {
      totalSessions: entries.length,
      totalFeaturesCompleted: completedFeatures,
      currentStreak: streak,
      lastSessionDate: lastSession ? lastSession.timestamp : null,
      recentProgress,
      blockedIssues: [...new Set(blockedIssues)]
    };
  }

  /**
   * Read the progress file content
   */
  private async readProgressFile(): Promise<string> {
    try {
      return await fs.promises.readFile(this.progressFilePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Parse progress entries from file content
   */
  private parseProgressEntries(content: string): ProgressEntry[] {
    const entries: ProgressEntry[] = [];
    const sections = content.split('### Session:');

    for (const section of sections.slice(1)) {
      const entry = this.parseSection(section);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Parse a single section into a ProgressEntry
   */
  private parseSection(section: string): ProgressEntry | null {
    try {
      const lines = section.trim().split('\n');
      const entry: Partial<ProgressEntry> = {
        filesModified: [],
        testsRun: 0,
        testsPassed: 0
      };

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('**Time:**')) {
          const timeStr = trimmed.replace('**Time:**', '').trim();
          entry.timestamp = new Date(timeStr);
        } else if (trimmed.startsWith('**Agent Type:**')) {
          entry.agentType = trimmed.replace('**Agent Type:**', '').trim() as any;
        } else if (trimmed.startsWith('**Summary:**')) {
          entry.summary = trimmed.replace('**Summary:**', '').trim();
        } else if (trimmed.startsWith('**Feature:**')) {
          entry.featureWorkedOn = trimmed.replace('**Feature:**', '').trim();
        } else if (trimmed.startsWith('**Status:** ✅ Completed')) {
          entry.featureCompleted = true;
        } else if (trimmed.startsWith('**Status:** 🔄 In Progress')) {
          entry.featureCompleted = false;
        } else if (trimmed.startsWith('**Tests:**')) {
          const match = trimmed.match(/(\d+)\/(\d+)/);
          if (match) {
            entry.testsPassed = parseInt(match[1]);
            entry.testsRun = parseInt(match[2]);
          }
        }
      }

      if (entry.sessionId && entry.summary) {
        return entry as ProgressEntry;
      }

      // Try to extract session ID from the first line
      const sessionIdMatch = lines[0]?.match(/^(\S+)/);
      if (sessionIdMatch) {
        entry.sessionId = sessionIdMatch[1];
      }

      return entry as ProgressEntry;
    } catch {
      return null;
    }
  }

  /**
   * Get a summary for the session startup prompt
   */
  async getStartupSummary(): Promise<string> {
    const snapshot = await this.getCurrentProgress();
    const lines: string[] = [];

    lines.push('## Current Project Status');
    lines.push('');
    lines.push(`- **Total Sessions:** ${snapshot.totalSessions}`);
    lines.push(`- **Features Completed:** ${snapshot.totalFeaturesCompleted}`);
    lines.push(`- **Current Streak:** ${snapshot.currentStreak} sessions`);

    if (snapshot.lastSessionDate) {
      const lastDate = new Date(snapshot.lastSessionDate).toLocaleDateString();
      lines.push(`- **Last Session:** ${lastDate}`);
    }

    if (snapshot.blockedIssues.length > 0) {
      lines.push('');
      lines.push('### Known Issues');
      for (const issue of snapshot.blockedIssues.slice(0, 5)) {
        lines.push(`- ${issue}`);
      }
    }

    if (snapshot.recentProgress.length > 0) {
      lines.push('');
      lines.push('### Recent Activity');
      for (const entry of snapshot.recentProgress) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        lines.push(`- **${date}:** ${entry.summary}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Add a quick note to the progress file
   */
  async addNote(note: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const noteText = `\n### Note [${timestamp}]\n${note}\n---\n`;
    await fs.promises.appendFile(this.progressFilePath, noteText, 'utf-8');
  }
}
