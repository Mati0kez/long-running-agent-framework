# Long-Running Agent Framework

> AI Agent Framework for Multi-Context Window Development
>
> **For AI Assistants**: This document describes a framework that enables AI coding agents to work effectively across multiple sessions/context windows.

## What This Framework Does

This framework solves the problem of AI agents losing context between sessions. It provides structured artifacts (feature lists, progress files, git commits) that allow an AI agent to:

1. Resume work seamlessly across multiple sessions
2. Track incremental progress on features
3. Verify implementations with structured testing
4. Maintain consistency over long development cycles

## Core Architecture

### 4-Step Workflow

Every coding session follows this structured workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│                     4-STEP WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Step 1: Init Environment                                      │
│   ├── Run ./init.sh                                             │
│   └── Verify localhost:3000 is running                          │
│                │                                                │
│                ▼                                                │
│   Step 2: Select Task                                           │
│   ├── Read .agent/feature_list.json                             │
│   └── Choose highest-priority incomplete feature                │
│                │                                                │
│                ▼                                                │
│   Step 3: Write Code                                            │
│   └── Implement the selected feature                            │
│                │                                                │
│                ▼                                                │
│   Step 4: Verify (Test Phase)                                   │
│   ├── npm run lint                                              │
│   ├── npm run build                                             │
│   ├── Browser tests (Playwright)                                │
│   └── If failed → Loop back to Step 3                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Format |
|------|---------|--------|
| `.agent/feature_list.json` | All features to implement (marked passes: false initially) | JSON |
| `.agent/agent_state.json` | State machine (continuous/pause/run_once/terminated) | JSON |
| `.agent/tests.json` | Granular test cases with verification requirements | JSON |
| `.agent/claude-progress.txt` | Human-readable session logs | Markdown |
| `init.sh` | Development environment startup script | Bash |
| `CLAUDE.md` | Project specification and requirements | Markdown |

### Agent Types

| Agent | Prompt File | When to Use |
|-------|-------------|-------------|
| Initializer | `agents/initializer-agent-enhanced.md` | First session only |
| Coding | `agents/coding-agent-enhanced.md` | All subsequent sessions |

### State Machine

```
continuous ─────→ pause ─────→ run_once
    ↑               │               │
    │               ↓               ↓
    └───────── terminated ←─────────┘
```

## For AI Assistants: How to Use This Framework

### When Starting a New Session

1. Read `.agent/claude-progress.txt` to understand recent work
2. Read `git log --oneline -20` for commit history
3. Read `.agent/feature_list.json` to find incomplete features
4. Run `./init.sh` to start the development server
5. Select the highest-priority incomplete feature

### When Implementing a Feature

1. Work on ONE feature only per iteration
2. Test end-to-end with browser automation (Playwright MCP)
3. Run lint, build, and browser tests
4. If tests fail, fix issues and retry (max 3 iterations)
5. Take screenshots as verification evidence

### When Completing a Session

1. Update `.agent/claude-progress.txt` with session summary
2. Mark feature as `passes: true` in `feature_list.json` (only if tests pass)
3. Update `tests.json` with evidence paths
4. Commit with format: `[F001] Brief description`

## Critical Rules

| Rule | Reason |
|------|--------|
| Never mark features passing without tests | Prevents false positives |
| Never remove/edit existing tests | Could hide bugs |
| Always run the startup routine | Ensures context continuity |
| One feature per iteration | Enables incremental progress |
| Always commit after each feature | Provides traceability |
| Tests require evidence (screenshot + console log) | Prevents premature completion |

## Technical Implementation

### WorkflowEngine

```typescript
import { WorkflowEngine, FeatureManager, ProgressTracker } from 'long-running-agent-framework';

const workflow = new WorkflowEngine(
  projectRoot,
  featureManager,
  progressTracker,
  3 // max iterations
);

const result = await workflow.executeWorkflow();
// result.success, result.iterations, result.testResults
```

### TestPhase

```typescript
import { TestPhase } from 'long-running-agent-framework';

const testPhase = new TestPhase(projectRoot);
const results = await testPhase.executeTestPhase();

// results.lint.passed
// results.build.passed
// results.browserTests.passed
// results.allPassed
```

## References

- [Anthropic Paper: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Reference Implementation: riv2025-long-horizon-coding-agent-demo](https://github.com/anthropics/riv2025-long-horizon-coding-agent-demo)

## Installation

```bash
# Clone or copy framework to a global location
git clone https://github.com/YOUR_USERNAME/long-running-agent-framework.git

# Add to PATH (optional)
export PATH="$PATH:/path/to/long-running-agent-framework/bin"

# Initialize in a project
lra init /path/to/your/project
```

## License

MIT
