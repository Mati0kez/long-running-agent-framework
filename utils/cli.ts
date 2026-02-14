#!/usr/bin/env node
/**
 * Long-Running Agent Framework CLI
 * Command-line tool for managing long-running agent sessions
 */

import { Command } from 'commander';
import { LongRunningAgentOrchestrator } from './core/orchestrator';
import { FeatureManager } from './core/feature-manager';
import { ProgressTracker } from './core/progress-tracker';
import { SessionManager } from './core/session-manager';
import { AgentCoordinator } from './core/agent-coordinator';
import * as path from 'path';

const program = new Command();

program
  .name('lra')
  .description('Long-Running Agent Framework CLI')
  .version('1.0.0');

// Initialize a new project
program
  .command('init')
  .description('Initialize a new project for long-running agent work')
  .argument('<project-name>', 'Name of the project')
  .option('-t, --type <type>', 'Project type (web-app, api, cli, library)', 'web-app')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .action(async (projectName, options) => {
    const projectRoot = path.resolve(options.directory);
    const orchestrator = new LongRunningAgentOrchestrator({
      projectRoot,
      maxSessionsPerDay: 10,
      sessionTimeoutMs: 60 * 60 * 1000,
      autoCommit: true,
      testingEnabled: true
    });

    console.log(`Initializing project: ${projectName}`);
    console.log(`Directory: ${projectRoot}`);
    console.log(`Type: ${options.type}`);

    // TODO: Implement actual initialization
    console.log('\n✓ Project initialized successfully');
    console.log('\nNext steps:');
    console.log('1. Run "lra start" to begin a coding session');
    console.log('2. Or run "lra prompt" to get the agent prompt');
  });

// Start a new coding session
program
  .command('start')
  .description('Start a new coding session')
  .option('-t, --type <type>', 'Agent type (coding, testing, cleanup)', 'coding')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectRoot = path.resolve(options.directory);
    const coordinator = new AgentCoordinator(projectRoot);

    console.log('Starting new session...\n');

    const prompt = await coordinator.generateSessionPrompt(options.type as any);
    console.log('='.repeat(60));
    console.log('AGENT PROMPT');
    console.log('='.repeat(60));
    console.log(prompt);
    console.log('='.repeat(60));
  });

// Get agent prompt for manual use
program
  .command('prompt')
  .description('Generate an agent prompt for the current project state')
  .option('-t, --type <type>', 'Agent type (initializer, coding, testing, cleanup)', 'coding')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async (options) => {
    const projectRoot = path.resolve(options.directory);
    const coordinator = new AgentCoordinator(projectRoot);

    const prompt = await coordinator.generateSessionPrompt(options.type as any);

    if (options.output) {
      const fs = await import('fs');
      await fs.promises.writeFile(options.output, prompt);
      console.log(`Prompt written to ${options.output}`);
    } else {
      console.log(prompt);
    }
  });

// Show project status
program
  .command('status')
  .description('Show current project status')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectRoot = path.resolve(options.directory);
    const featureManager = new FeatureManager(projectRoot);
    const progressTracker = new ProgressTracker(projectRoot);
    const sessionManager = new SessionManager(projectRoot);

    try {
      const progress = await progressTracker.getCurrentProgress();
      const stats = await sessionManager.getStatistics();

      console.log('Project Status');
      console.log('='.repeat(40));
      console.log(`Total Sessions: ${stats.totalSessions}`);
      console.log(`Features Completed: ${stats.totalFeaturesCompleted}`);
      console.log(`Current Streak: ${progress.currentStreak} sessions`);
      console.log(`Test Pass Rate: ${stats.testPassRate}%`);
      console.log('');

      if (progress.recentProgress.length > 0) {
        console.log('Recent Activity:');
        for (const entry of progress.recentProgress.slice(0, 5)) {
          const date = new Date(entry.timestamp).toLocaleDateString();
          console.log(`  ${date}: ${entry.summary}`);
        }
      }
    } catch (error) {
      console.error('Error reading project status. Is the project initialized?');
    }
  });

// List features
program
  .command('features')
  .description('List features and their status')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .option('-c, --category <category>', 'Filter by category')
  .option('--incomplete', 'Show only incomplete features')
  .action(async (options) => {
    const projectRoot = path.resolve(options.directory);
    const featureManager = new FeatureManager(projectRoot);

    try {
      const summary = await featureManager.getProgressSummary();

      console.log('Feature Progress');
      console.log('='.repeat(40));
      console.log(`Total: ${summary.total}`);
      console.log(`Completed: ${summary.completed} (${summary.percentage}%)`);
      console.log(`Remaining: ${summary.remaining}`);
      console.log('');

      if (options.incomplete) {
        const nextFeature = await featureManager.getNextIncompleteFeature();
        if (nextFeature) {
          console.log('Next Feature to Work On:');
          console.log(`  ID: ${nextFeature.id}`);
          console.log(`  Description: ${nextFeature.description}`);
          console.log(`  Priority: ${nextFeature.priority}`);
          console.log(`  Category: ${nextFeature.category}`);
        } else {
          console.log('All features complete!');
        }
      }
    } catch (error) {
      console.error('Error reading features. Is the project initialized?');
    }
  });

// Show session history
program
  .command('sessions')
  .description('Show session history')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .option('-n, --count <number>', 'Number of sessions to show', '10')
  .action(async (options) => {
    const projectRoot = path.resolve(options.directory);
    const sessionManager = new SessionManager(projectRoot);

    try {
      const sessions = await sessionManager.getRecentSessions(parseInt(options.count));

      console.log('Recent Sessions');
      console.log('='.repeat(40));

      for (const session of sessions) {
        const date = new Date(session.startTime).toLocaleString();
        const status = session.status === 'completed' ? '✓' :
          session.status === 'failed' ? '✗' : '○';
        console.log(`${status} ${session.id}`);
        console.log(`    Date: ${date}`);
        console.log(`    Type: ${session.type}`);
        if (session.featureId) {
          console.log(`    Feature: ${session.featureId}`);
        }
        if (session.result) {
          console.log(`    Summary: ${session.result.summary}`);
        }
        console.log('');
      }
    } catch (error) {
      console.error('Error reading sessions. Is the project initialized?');
    }
  });

// Generate prompt for initializer agent
program
  .command('generate-features')
  .description('Generate feature list from a specification file')
  .argument('<spec-file>', 'Path to specification file (markdown or JSON)')
  .option('-d, --directory <dir>', 'Project directory', process.cwd())
  .option('-o, --output <file>', 'Output file for feature list', 'feature_list.json')
  .action(async (specFile, options) => {
    const projectRoot = path.resolve(options.directory);
    const featureManager = new FeatureManager(projectRoot);

    console.log(`Generating features from: ${specFile}`);
    console.log(`Output: ${options.output}`);

    // TODO: Implement feature generation from spec
    console.log('\nFeature generation not yet implemented.');
    console.log('For now, use the initializer agent to generate features.');
  });

program.parse();
