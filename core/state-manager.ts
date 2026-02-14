/**
 * Agent State Manager
 * Based on Anthropic's riv2025-long-horizon-coding-agent-demo
 *
 * Manages agent state transitions across context windows.
 * State is persisted to agent_state.json for continuity.
 */

import * as fs from 'fs';
import * as path from 'path';

export type AgentState = 'continuous' | 'run_once' | 'run_cleanup' | 'pause' | 'terminated';
export type AgentPhase = 'initializer' | 'building' | 'enhancing' | 'cleanup' | 'complete';

export const VALID_STATES: Set<AgentState> = new Set([
  'continuous',
  'run_once',
  'run_cleanup',
  'pause',
  'terminated'
]);

export interface AgentStateData {
  desired_state: AgentState;
  current_state: AgentState;
  timestamp: string;
  setBy: 'agent' | 'human' | 'system';
  note: string;
  phase?: AgentPhase;
  current_issue?: number;
  restart_count?: number;
  last_commit?: string;
}

const STATE_FILE_NAME = 'agent_state.json';

export class StateManager {
  private projectRoot: string;
  private stateFilePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.stateFilePath = path.join(projectRoot, STATE_FILE_NAME);
  }

  /**
   * Get current UTC timestamp in ISO 8601 format
   */
  private getUtcTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Read agent state from agent_state.json
   * Returns default pause state if file doesn't exist
   */
  readState(): AgentStateData {
    if (!fs.existsSync(this.stateFilePath)) {
      return {
        desired_state: 'pause',
        current_state: 'pause',
        timestamp: this.getUtcTimestamp(),
        setBy: 'agent',
        note: 'Default state (file did not exist)'
      };
    }

    try {
      const content = fs.readFileSync(this.stateFilePath, 'utf-8');
      const state = JSON.parse(content) as AgentStateData;

      // Validate state structure
      if (!state.desired_state || !state.current_state) {
        console.warn('⚠️ agent_state.json missing required fields, using default pause state');
        return {
          desired_state: 'pause',
          current_state: 'pause',
          timestamp: this.getUtcTimestamp(),
          setBy: 'agent',
          note: 'Malformed state file'
        };
      }

      // Validate state values
      if (!VALID_STATES.has(state.desired_state)) {
        console.warn(`⚠️ Unknown desired_state '${state.desired_state}', treating as 'pause'`);
        state.desired_state = 'pause';
      }

      if (!VALID_STATES.has(state.current_state)) {
        console.warn(`⚠️ Unknown current_state '${state.current_state}', treating as 'pause'`);
        state.current_state = 'pause';
      }

      return state;
    } catch (error) {
      console.warn(`⚠️ Error reading agent_state.json: ${error}, using default pause state`);
      return {
        desired_state: 'pause',
        current_state: 'pause',
        timestamp: this.getUtcTimestamp(),
        setBy: 'agent',
        note: `Read error: ${error}`
      };
    }
  }

  /**
   * Write agent state to agent_state.json
   * Updates only the fields provided, preserves others
   */
  writeState(updates: Partial<AgentStateData>): void {
    const currentState = this.readState();
    const newState: AgentStateData = {
      ...currentState,
      ...updates,
      timestamp: this.getUtcTimestamp(),
      setBy: updates.setBy || 'agent'
    };

    // Validate desired_state if provided
    if (updates.desired_state && !VALID_STATES.has(updates.desired_state)) {
      console.warn(`⚠️ Attempting to set invalid desired_state '${updates.desired_state}', ignoring`);
      newState.desired_state = currentState.desired_state;
    }

    // Validate current_state if provided
    if (updates.current_state && !VALID_STATES.has(updates.current_state)) {
      console.warn(`⚠️ Attempting to set invalid current_state '${updates.current_state}', ignoring`);
      newState.current_state = currentState.current_state;
    }

    // Write atomically using temp file
    const tempPath = `${this.stateFilePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(newState, null, 2));
      fs.renameSync(tempPath, this.stateFilePath);
    } catch (error) {
      console.error(`⚠️ Error writing agent state: ${error}`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Update only current_state (most common operation)
   */
  updateCurrentState(current: AgentState, note?: string): void {
    this.writeState({
      current_state: current,
      note: note || `State updated to ${current}`
    });
  }

  /**
   * Transition to pause state
   */
  pause(note?: string): void {
    this.writeState({
      desired_state: 'pause',
      current_state: 'pause',
      note: note || 'Agent paused'
    });
  }

  /**
   * Start continuous mode
   */
  startContinuous(note?: string): void {
    this.writeState({
      desired_state: 'continuous',
      current_state: 'continuous',
      note: note || 'Starting continuous mode'
    });
  }

  /**
   * Request single run
   */
  requestRunOnce(note?: string): void {
    this.writeState({
      desired_state: 'run_once',
      note: note || 'Single run requested'
    });
  }

  /**
   * Request cleanup session
   */
  requestCleanup(note?: string): void {
    this.writeState({
      desired_state: 'run_cleanup',
      note: note || 'Cleanup session requested'
    });
  }

  /**
   * Terminate agent
   */
  terminate(note?: string): void {
    this.writeState({
      desired_state: 'terminated',
      current_state: 'terminated',
      note: note || 'Agent terminated'
    });
  }

  /**
   * Check if agent should pause
   */
  shouldPause(): boolean {
    const state = this.readState();
    return state.desired_state === 'pause' || state.desired_state === 'terminated';
  }

  /**
   * Check if agent should continue running
   */
  shouldContinue(): boolean {
    const state = this.readState();
    return state.desired_state === 'continuous';
  }

  /**
   * Check if agent is in run-once mode
   */
  isRunOnce(): boolean {
    const state = this.readState();
    return state.desired_state === 'run_once';
  }

  /**
   * Check if cleanup is requested
   */
  isCleanupRequested(): boolean {
    const state = this.readState();
    return state.desired_state === 'run_cleanup';
  }

  /**
   * Get state summary for logging
   */
  getStateSummary(): string {
    const state = this.readState();
    return `desired='${state.desired_state}', current='${state.current_state}', phase='${state.phase || 'unknown'}'`;
  }
}
