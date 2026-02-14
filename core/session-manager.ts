/**
 * Session Manager
 * Manages agent sessions and their lifecycle
 *
 * Each session represents a discrete context window where an agent works
 * on a specific task. Sessions are tracked to enable continuity.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type AgentType = 'initializer' | 'coding' | 'testing' | 'cleanup';
export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

export interface Session {
  id: string;
  type: AgentType;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  featureId?: string;
  parentSessionId?: string;
  metadata: SessionMetadata;
  result?: SessionResult;
}

export interface SessionMetadata {
  modelUsed?: string;
  tokensUsed?: number;
  contextWindowUsage?: number;
  toolsInvoked?: string[];
  errors?: string[];
}

export interface SessionResult {
  success: boolean;
  summary: string;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  featureCompleted: boolean;
}

export class SessionManager {
  private projectRoot: string;
  private sessionsPath: string;
  private currentSession: Session | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.sessionsPath = path.join(projectRoot, '.agent-sessions');
  }

  /**
   * Initialize the sessions directory
   */
  private async ensureSessionsDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.sessionsPath, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  /**
   * Create a new session
   */
  async createSession(type: AgentType, parentSessionId?: string): Promise<Session> {
    await this.ensureSessionsDir();

    const session: Session = {
      id: this.generateSessionId(type),
      type,
      status: 'pending',
      startTime: new Date(),
      parentSessionId,
      metadata: {}
    };

    await this.saveSession(session);
    this.currentSession = session;

    return session;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(type: AgentType): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shortUuid = uuidv4().slice(0, 8);
    return `${type}-${date}-${shortUuid}`;
  }

  /**
   * Save session to disk
   */
  private async saveSession(session: Session): Promise<void> {
    const sessionPath = path.join(this.sessionsPath, `${session.id}.json`);
    await fs.promises.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`);
      const content = await fs.promises.readFile(sessionPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Start a session (transition from pending to running)
   */
  async startSession(sessionId: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'running';
    await this.saveSession(session);
    this.currentSession = session;
  }

  /**
   * End a session with a status
   */
  async endSession(
    sessionId: string,
    status: 'completed' | 'failed' | 'timeout',
    result?: SessionResult
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = status;
    session.endTime = new Date();
    if (result) {
      session.result = result;
    }

    await this.saveSession(session);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Update session metadata
   */
  async updateMetadata(
    sessionId: string,
    metadata: Partial<SessionMetadata>
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.metadata = {
      ...session.metadata,
      ...metadata
    };

    await this.saveSession(session);
  }

  /**
   * Set the feature being worked on in this session
   */
  async setFeature(sessionId: string, featureId: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.featureId = featureId;
    await this.saveSession(session);
  }

  /**
   * Get all sessions, optionally filtered
   */
  async getSessions(filter?: SessionFilter): Promise<Session[]> {
    await this.ensureSessionsDir();

    const files = await fs.promises.readdir(this.sessionsPath);
    const sessions: Session[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        const session = await this.loadSession(sessionId);
        if (session && this.matchesFilter(session, filter)) {
          sessions.push(session);
        }
      }
    }

    // Sort by start time, newest first
    sessions.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return sessions;
  }

  /**
   * Check if session matches filter criteria
   */
  private matchesFilter(session: Session, filter?: SessionFilter): boolean {
    if (!filter) return true;

    if (filter.type && session.type !== filter.type) return false;
    if (filter.status && session.status !== filter.status) return false;
    if (filter.featureId && session.featureId !== filter.featureId) return false;

    if (filter.startDate) {
      const sessionDate = new Date(session.startTime);
      if (sessionDate < filter.startDate) return false;
    }

    if (filter.endDate) {
      const sessionDate = new Date(session.startTime);
      if (sessionDate > filter.endDate) return false;
    }

    return true;
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<SessionStatistics> {
    const sessions = await this.getSessions();

    const completed = sessions.filter(s => s.status === 'completed');
    const failed = sessions.filter(s => s.status === 'failed');

    const totalFeaturesCompleted = sessions.filter(
      s => s.result?.featureCompleted
    ).length;

    const totalTestsRun = sessions.reduce(
      (sum, s) => sum + (s.result?.testsRun || 0),
      0
    );

    const totalTestsPassed = sessions.reduce(
      (sum, s) => sum + (s.result?.testsPassed || 0),
      0
    );

    // Calculate average session duration
    const durations = sessions
      .filter(s => s.endTime)
      .map(s =>
        new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()
      );

    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      totalFeaturesCompleted,
      totalTestsRun,
      totalTestsPassed,
      testPassRate: totalTestsRun > 0
        ? Math.round((totalTestsPassed / totalTestsRun) * 100)
        : 0,
      averageSessionDurationMs: avgDurationMs,
      sessionsByType: {
        initializer: sessions.filter(s => s.type === 'initializer').length,
        coding: sessions.filter(s => s.type === 'coding').length,
        testing: sessions.filter(s => s.type === 'testing').length,
        cleanup: sessions.filter(s => s.type === 'cleanup').length
      }
    };
  }

  /**
   * Get recent sessions for context
   */
  async getRecentSessions(count: number = 5): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.slice(0, count);
  }

  /**
   * Clean up old session files
   */
  async cleanupOldSessions(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const sessions = await this.getSessions();
    let deleted = 0;

    for (const session of sessions) {
      const sessionDate = new Date(session.startTime);
      if (sessionDate < cutoff && session.status !== 'running') {
        const sessionPath = path.join(this.sessionsPath, `${session.id}.json`);
        try {
          await fs.promises.unlink(sessionPath);
          deleted++;
        } catch {
          // Ignore errors
        }
      }
    }

    return deleted;
  }
}

// Type definitions
interface SessionFilter {
  type?: AgentType;
  status?: SessionStatus;
  featureId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface SessionStatistics {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalFeaturesCompleted: number;
  totalTestsRun: number;
  totalTestsPassed: number;
  testPassRate: number;
  averageSessionDurationMs: number;
  sessionsByType: {
    initializer: number;
    coding: number;
    testing: number;
    cleanup: number;
  };
}
