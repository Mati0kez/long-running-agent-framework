/**
 * Human Backlog Manager
 * Based on Anthropic's riv2025-long-horizon-coding-agent-demo
 *
 * Tracks explicit human requests (bugs, features, ideas).
 * These take precedence over general test completion work.
 */

import * as fs from 'fs';
import * as path from 'path';

export type BacklogItemType = 'bug' | 'feature' | 'idea';
export type BacklogPriority = 'critical' | 'high' | 'medium' | 'low';
export type BacklogStatus = 'backlog' | 'in_progress' | 'blocked' | 'done';

export interface BacklogComment {
  author: 'agent' | 'human';
  timestamp: string;
  text: string;
}

export interface BacklogItem {
  id: string;
  type: BacklogItemType;
  priority: BacklogPriority;
  status: BacklogStatus;
  description: string;
  details: string;
  comments: BacklogComment[];
  added: string;
  completed: boolean;
  completedDate?: string;
  github_issue?: number;
  vote_count?: number;
}

const BACKLOG_FILE_NAME = 'human_backlog.json';

export class BacklogManager {
  private projectRoot: string;
  private backlogFilePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.backlogFilePath = path.join(projectRoot, BACKLOG_FILE_NAME);
  }

  /**
   * Load backlog from file
   */
  loadBacklog(): BacklogItem[] {
    if (!fs.existsSync(this.backlogFilePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.backlogFilePath, 'utf-8');
      return JSON.parse(content) as BacklogItem[];
    } catch (error) {
      console.error(`⚠️ Error loading human_backlog.json: ${error}`);
      return [];
    }
  }

  /**
   * Save backlog to file
   */
  private saveBacklog(backlog: BacklogItem[]): void {
    const tempPath = `${this.backlogFilePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(backlog, null, 2));
      fs.renameSync(tempPath, this.backlogFilePath);
    } catch (error) {
      console.error(`⚠️ Error saving human_backlog.json: ${error}`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Add a new item to the backlog
   */
  addItem(
    type: BacklogItemType,
    priority: BacklogPriority,
    description: string,
    details: string = '',
    github_issue?: number
  ): BacklogItem {
    const backlog = this.loadBacklog();

    const item: BacklogItem = {
      id: Date.now().toString(),
      type,
      priority,
      status: 'backlog',
      description,
      details,
      comments: [],
      added: new Date().toISOString(),
      completed: false,
      github_issue,
      vote_count: 0
    };

    backlog.push(item);
    this.saveBacklog(backlog);

    return item;
  }

  /**
   * Get item by ID
   */
  getItem(id: string): BacklogItem | null {
    const backlog = this.loadBacklog();
    return backlog.find(item => item.id === id) || null;
  }

  /**
   * Get item by GitHub issue number
   */
  getItemByIssue(issueNumber: number): BacklogItem | null {
    const backlog = this.loadBacklog();
    return backlog.find(item => item.github_issue === issueNumber) || null;
  }

  /**
   * Update item status
   */
  updateStatus(id: string, status: BacklogStatus): boolean {
    const backlog = this.loadBacklog();
    const item = backlog.find(i => i.id === id);

    if (!item) {
      console.error(`⚠️ Backlog item not found: ${id}`);
      return false;
    }

    item.status = status;

    if (status === 'done') {
      item.completed = true;
      item.completedDate = new Date().toISOString();
    }

    this.saveBacklog(backlog);
    return true;
  }

  /**
   * Mark item as complete
   */
  markComplete(id: string): boolean {
    return this.updateStatus(id, 'done');
  }

  /**
   * Mark item as in progress
   */
  markInProgress(id: string): boolean {
    return this.updateStatus(id, 'in_progress');
  }

  /**
   * Mark item as blocked
   */
  markBlocked(id: string, reason: string): boolean {
    const backlog = this.loadBacklog();
    const item = backlog.find(i => i.id === id);

    if (!item) {
      return false;
    }

    item.status = 'blocked';
    item.comments.push({
      author: 'agent',
      timestamp: new Date().toISOString(),
      text: `Blocked: ${reason}`
    });

    this.saveBacklog(backlog);
    return true;
  }

  /**
   * Add a comment to an item
   */
  addComment(id: string, author: 'agent' | 'human', text: string): boolean {
    const backlog = this.loadBacklog();
    const item = backlog.find(i => i.id === id);

    if (!item) {
      return false;
    }

    item.comments.push({
      author,
      timestamp: new Date().toISOString(),
      text
    });

    this.saveBacklog(backlog);
    return true;
  }

  /**
   * Get next item to work on
   * Priority: in_progress > critical > high > medium > low
   */
  getNextItem(): BacklogItem | null {
    const backlog = this.loadBacklog();

    // Filter incomplete items
    const incomplete = backlog.filter(item => !item.completed);

    if (incomplete.length === 0) {
      return null;
    }

    // First: resume in-progress items
    const inProgress = incomplete.find(item => item.status === 'in_progress');
    if (inProgress) {
      console.log(`📌 Resuming in-progress: ${inProgress.description}`);
      return inProgress;
    }

    // Then: by priority order
    const priorityOrder: BacklogPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorityOrder) {
      const item = incomplete.find(i => i.priority === priority && i.status === 'backlog');
      if (item) {
        return item;
      }
    }

    // Include blocked items as last resort
    for (const priority of priorityOrder) {
      const item = incomplete.find(i => i.priority === priority);
      if (item) {
        return item;
      }
    }

    return incomplete[0];
  }

  /**
   * Get all items by status
   */
  getItemsByStatus(status: BacklogStatus): BacklogItem[] {
    const backlog = this.loadBacklog();
    return backlog.filter(item => item.status === status);
  }

  /**
   * Get all items by priority
   */
  getItemsByPriority(priority: BacklogPriority): BacklogItem[] {
    const backlog = this.loadBacklog();
    return backlog.filter(item => item.priority === priority);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    backlog: number;
    byPriority: Record<BacklogPriority, { total: number; completed: number }>;
    byType: Record<BacklogItemType, number>;
  } {
    const backlog = this.loadBacklog();

    const byPriority: Record<BacklogPriority, { total: number; completed: number }> = {
      critical: { total: 0, completed: 0 },
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 }
    };

    const byType: Record<BacklogItemType, number> = {
      bug: 0,
      feature: 0,
      idea: 0
    };

    for (const item of backlog) {
      byPriority[item.priority].total++;
      if (item.completed) {
        byPriority[item.priority].completed++;
      }
      byType[item.type]++;
    }

    return {
      total: backlog.length,
      completed: backlog.filter(i => i.completed).length,
      inProgress: backlog.filter(i => i.status === 'in_progress').length,
      blocked: backlog.filter(i => i.status === 'blocked').length,
      backlog: backlog.filter(i => i.status === 'backlog').length,
      byPriority,
      byType
    };
  }

  /**
   * Sort backlog by vote count and priority
   */
  sortBacklog(): void {
    const backlog = this.loadBacklog();

    backlog.sort((a, b) => {
      // Completed items at the end
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // In-progress items first
      if (a.status === 'in_progress' && b.status !== 'in_progress') {
        return -1;
      }
      if (b.status === 'in_progress' && a.status !== 'in_progress') {
        return 1;
      }

      // Then by vote count (higher first)
      const voteA = a.vote_count || 0;
      const voteB = b.vote_count || 0;
      if (voteA !== voteB) {
        return voteB - voteA;
      }

      // Then by priority
      const priorityOrder: BacklogPriority[] = ['critical', 'high', 'medium', 'low'];
      const priorityA = priorityOrder.indexOf(a.priority);
      const priorityB = priorityOrder.indexOf(b.priority);

      return priorityA - priorityB;
    });

    this.saveBacklog(backlog);
  }

  /**
   * Export backlog as markdown
   */
  exportReport(): string {
    const backlog = this.loadBacklog();
    const summary = this.getSummary();

    let report = `# Human Backlog\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| Total | ${summary.total} |\n`;
    report += `| Completed | ${summary.completed} |\n`;
    report += `| In Progress | ${summary.inProgress} |\n`;
    report += `| Blocked | ${summary.blocked} |\n`;
    report += `| Backlog | ${summary.backlog} |\n\n`;

    report += `## Priority Items\n\n`;

    const incomplete = backlog.filter(i => !i.completed);
    const priorityOrder: BacklogPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorityOrder) {
      const items = incomplete.filter(i => i.priority === priority);
      if (items.length > 0) {
        report += `### ${priority.toUpperCase()}\n\n`;
        for (const item of items) {
          const statusIcon = item.status === 'in_progress' ? '🔄' :
            item.status === 'blocked' ? '🚫' : '📋';
          const typeIcon = item.type === 'bug' ? '🐛' :
            item.type === 'feature' ? '✨' : '💡';

          report += `- ${statusIcon} ${typeIcon} **${item.description}**\n`;
          if (item.details) {
            report += `  ${item.details}\n`;
          }
          if (item.github_issue) {
            report += `  [Issue #${item.github_issue}]\n`;
          }
        }
        report += `\n`;
      }
    }

    return report;
  }
}
