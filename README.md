# Long-Running Agent Framework

> AI Agent Framework for Multi-Context Window Development

A framework for managing AI agents that work across multiple context windows, based on [Anthropic's research](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) on effective harnesses for long-running agents.

[![GitHub](https://img.shields.io/badge/GitHub-Mati0kez/long--running--agent--framework-blue)](https://github.com/Mati0kez/long-running-agent-framework)

---

## 快速开始

### 步骤 1: 克隆仓库

```bash
# Windows
git clone https://github.com/Mati0kez/long-running-agent-framework.git <LRA_PATH>

# Linux/macOS
git clone https://github.com/Mati0kez/long-running-agent-framework.git <LRA_PATH>
```

> 将 `<LRA_PATH>` 替换为你的安装路径，例如：
> - Windows: `D:\long-running-agent-framework`
> - Linux/macOS: `/home/user/long-running-agent-framework`

### 步骤 2: 安装 Skills

将 `skills/` 目录中的文件复制到 Claude Code 的 skills 目录：

```bash
# Windows
cp <LRA_PATH>\skills\*.md C:\Users\<你的用户名>\.claude\skills\

# Linux/macOS
cp <LRA_PATH>/skills/*.md ~/.claude/skills/
```

### 步骤 3: 配置路径

打开复制的 skill 文件，将所有 `<LRA_PATH>` 替换为你的实际安装路径。

**需要修改的文件：**
- `lra.md`
- `lra-install.md`
- `lra-dev.md`

### 步骤 4: 验证安装

```bash
# 测试 CLI
<LRA_PATH>/bin/lra

# 应显示使用帮助
```

### 步骤 5: 在项目中使用

```bash
# 进入你的项目目录
cd /path/to/your/project

# 初始化框架
<LRA_PATH>/bin/lra init

# 启动编码代理
claude --prompt-file <LRA_PATH>/agents/coding-agent-enhanced.md
```

---

## Skills 使用说明

安装完成后，可以在 Claude Code 中使用以下命令：

| 命令 | 说明 |
|------|------|
| `/lra init` | 初始化项目 |
| `/lra dev` | 启动编码代理 |
| `/lra status` | 检查项目状态 |
| `/lra-install` | 安装/更新框架 |

---

## Overview

The core challenge of long-running agents is that they must work in discrete sessions, and each new session begins with no memory of what came before. This framework provides a structured approach to enable consistent progress across many context windows.

## Key Concepts

### The Problem

1. **One-shotting**: Agents try to do too much at once, running out of context mid-implementation
2. **Premature completion**: After some features are built, later agents declare the job done prematurely
3. **Undocumented progress**: Sessions end with half-implemented features and no clear handoff

### The Solution

Two specialized agent types with clear responsibilities:

| Agent | Role | When to Use |
|-------|------|-------------|
| **Initializer** | Sets up environment | First session only |
| **Coding** | Implements features incrementally | All subsequent sessions |

## Architecture

```
long-running-agent-framework/
├── core/
│   ├── orchestrator.ts      # Main orchestration logic
│   ├── workflow-engine.ts   # 4-step workflow engine (NEW)
│   ├── test-phase.ts        # Structured test phase (NEW)
│   ├── feature-manager.ts   # Feature list management
│   ├── progress-tracker.ts  # Progress file management
│   ├── session-manager.ts   # Session lifecycle
│   ├── agent-coordinator.ts # Agent type coordination
│   ├── state-manager.ts     # State machine (continuous/pause/run_once)
│   ├── test-manager.ts      # Granular test management
│   ├── backlog-manager.ts   # Human request tracking
│   └── index.ts            # Exports
├── agents/
│   ├── initializer-agent.md       # Initializer prompt template
│   ├── coding-agent-enhanced.md   # Coding agent with 4-step workflow
│   ├── coding-agent.md            # Basic coding prompt
│   └── testing-agent.md           # Testing prompt template
├── utils/
│   └── cli.ts              # Command-line tool
└── templates/
    └── feature-list.json   # Example feature list
```

## 4-Step Workflow Architecture

Based on the framework design, the coding agent follows a structured 4-step workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROJECT FILES LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  CLAUDE.md │ init.sh │ feature_list.json │ progress.txt        │
│  tests.json                                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
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
│   ├── Read feature_list.json                                    │
│   └── Choose highest-priority incomplete feature                │
│                │                                                │
│                ▼                                                │
│   Step 3: Write Code                                            │
│   └── Implement the selected feature                            │
│                │                                                │
│                ▼                                                │
│   Step 4: Verify (Test Phase)                                   │
│   ┌──────────────────────────────────────┐                      │
│   │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                      │
│   │  │  lint   │ │  build  │ │ browser│ │                      │
│   │  └────┬────┘ └────┬────┘ └───┬────┘ │                      │
│   │       └───────────┼──────────┘      │                      │
│   │                   ▼                 │                      │
│   │           All Passed?               │                      │
│   │         ┌──────┴──────┐             │                      │
│   │         ▼             ▼             │                      │
│   │       [YES]         [NO]            │                      │
│   │         │             │             │                      │
│   │         ▼             └──► Loop to Step 3                  │
│   │    Continue                         │                      │
│   └──────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine Architecture (from riv2025)

The agent operates as a state machine with these states:

| State | Description | Transitions To |
|-------|-------------|----------------|
| `continuous` | Run sessions indefinitely | pause, run_once, run_cleanup |
| `run_once` | Execute single session then pause | pause |
| `run_cleanup` | Remove technical debt then pause | pause |
| `pause` | Wait for human command | continuous, run_once, run_cleanup |
| `terminated` | Agent stopped | - |

State is persisted in `agent_state.json`:

```json
{
  "desired_state": "continuous",
  "current_state": "continuous",
  "timestamp": "2026-02-14T12:00:00.000Z",
  "setBy": "agent",
  "note": "Running in continuous mode",
  "phase": "building"
}
```

## Key Components

### 1. Feature List (`feature_list.json`)

A comprehensive JSON file with ALL feature requirements:

```json
{
  "projectName": "claude.ai-clone",
  "features": [
    {
      "id": "F001",
      "category": "functional",
      "description": "User can send a message and receive AI response",
      "steps": [
        "Navigate to chat interface",
        "Type a message in the input field",
        "Press Enter or click Send",
        "Verify message appears in chat",
        "Verify AI response is displayed"
      ],
      "passes": false,
      "priority": 10
    }
  ]
}
```

**Key insight**: Using JSON prevents inappropriate edits (agents are less likely to modify JSON vs Markdown).

### 2. Progress File (`claude-progress.txt`)

Human-readable log of what agents have done:

```markdown
### Session: coding-20260213-a1b2c3d4
**Time:** 2026-02-13T10:30:00Z
**Agent Type:** coding

**Summary:** Implemented message sending feature

**Feature:** F001 - User can send a message
**Status:** ✅ Completed

**Files Modified:**
  - src/components/Chat.tsx
  - src/hooks/useChat.ts

**Tests:** 5/5 passed (100%)

**Next Steps:**
  - Work on F002: AI response streaming

---
```

### 3. init.sh Script

Development environment startup script created by the initializer agent:

```bash
#!/bin/bash
npm run dev &
sleep 5
echo "Server running at http://localhost:3000"
```

### 4. Test Suite (`tests.json`)

Granular test management with verification requirements:

```json
{
  "version": "1.0.0",
  "tests": [
    {
      "id": "FUN-abc123",
      "category": "functional",
      "description": "User can send a message",
      "steps": [
        "Navigate to chat page",
        "Type message in input",
        "Press Enter",
        "Verify message appears"
      ],
      "passes": false,
      "priority": "critical",
      "screenshot_path": null,
      "console_log_path": null
    }
  ]
}
```

**Critical Rules:**
- Tests can ONLY be marked passing with evidence (screenshot + console log)
- Bulk modifications to tests.json are blocked
- Console logs must show no errors for test to pass

### 5. Human Backlog (`human_backlog.json`)

Tracks explicit human requests that take priority:

```json
[
  {
    "id": "1739548800000",
    "type": "bug",
    "priority": "critical",
    "status": "in_progress",
    "description": "Fix login button not working on mobile",
    "details": "Button is unresponsive on iOS Safari"
  }
]
```

**Priority Order:**
1. In-progress items (resume interrupted work)
2. Critical priority
3. High priority
4. Medium/Low priority

## Session Workflow

### Initializer Agent (First Session)

1. Create `init.sh` script
2. Generate comprehensive `feature_list.json`
3. Create initial git commit
4. Initialize `claude-progress.txt`

### Coding Agent (All Subsequent Sessions)

```
┌─────────────────────────────────────────────┐
│           SESSION STARTUP ROUTINE           │
├─────────────────────────────────────────────┤
│ 1. pwd                                      │
│ 2. cat claude-progress.txt                  │
│ 3. git log --oneline -20                    │
│ 4. cat feature_list.json                    │
│ 5. ./init.sh                                │
│ 6. Run basic E2E tests                      │
│ 7. Choose next incomplete feature           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         FEATURE IMPLEMENTATION              │
├─────────────────────────────────────────────┤
│ • Work on ONE feature only                  │
│ • Test end-to-end with browser automation   │
│ • Leave code in clean state                 │
│ • Commit with descriptive message           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           SESSION END ROUTINE               │
├─────────────────────────────────────────────┤
│ • Update claude-progress.txt                │
│ • Update feature status in JSON             │
│ • Document next steps                       │
└─────────────────────────────────────────────┘
```

## Usage

### CLI Tool

```bash
# Initialize a new project
lra init my-project --type web-app

# Start a coding session
lra start --type coding

# Get agent prompt
lra prompt --type coding

# Check project status
lra status

# List features
lra features --incomplete

# View session history
lra sessions --count 20
```

### Programmatic Usage

```typescript
import { LongRunningAgentOrchestrator } from 'long-running-agent-framework';

const orchestrator = new LongRunningAgentOrchestrator({
  projectRoot: '/path/to/project',
  maxSessionsPerDay: 10,
  sessionTimeoutMs: 60 * 60 * 1000,
  autoCommit: true,
  testingEnabled: true
});

// Initialize project
await orchestrator.initializeProject({
  name: 'My App',
  description: 'A web application',
  type: 'web-app',
  features: [...],
  techStack: ['typescript', 'react', 'node']
});

// Start coding session
const context = await orchestrator.startCodingSession();
console.log(context.startupChecklist);
console.log(context.nextFeature);
```

### Using WorkflowEngine

The `WorkflowEngine` implements the 4-step workflow:

```typescript
import {
  WorkflowEngine,
  FeatureManager,
  ProgressTracker,
  TestPhase
} from 'long-running-agent-framework';

const featureManager = new FeatureManager('/path/to/project');
const progressTracker = new ProgressTracker('/path/to/project');

const workflow = new WorkflowEngine(
  '/path/to/project',
  featureManager,
  progressTracker,
  3 // max iterations
);

// Execute complete workflow
const result = await workflow.executeWorkflow();

console.log(`Success: ${result.success}`);
console.log(`Iterations: ${result.iterations}`);
console.log(`Feature: ${result.featureId}`);

// Check test phase results
if (result.testResults) {
  console.log(`Lint: ${result.testResults.lint.passed}`);
  console.log(`Build: ${result.testResults.build.passed}`);
  console.log(`Browser: ${result.testResults.browserTests.passed}`);
}
```

### Using TestPhase

The `TestPhase` runs structured verification:

```typescript
import { TestPhase } from 'long-running-agent-framework';

const testPhase = new TestPhase('/path/to/project', {
  lintCommand: 'npm run lint',
  buildCommand: 'npm run build',
  browserTestTimeout: 60000,
  captureScreenshots: true
});

// Run all tests
const results = await testPhase.executeTestPhase();

console.log(testPhase.formatSummary(results));
// Output:
// ╔═══════════════════════════════════════════════════════════╗
// ║                    TEST PHASE RESULTS                     ║
// ╠═══════════════════════════════════════════════════════════╣
// ║  Lint Check:      ✅ PASSED                               ║
// ║  Build:           ✅ PASSED                               ║
// ║  Browser Tests:   ✅ PASSED                               ║
// ╠═══════════════════════════════════════════════════════════╣
// ║  All Passed:      ✅ YES                                  ║
// ║  Duration:        45000ms                                 ║
// ╚═══════════════════════════════════════════════════════════╝

// Run individual tests
const lintResult = await testPhase.runTest('lint');
const buildResult = await testPhase.runTest('build');
const browserResult = await testPhase.runTest('browser');
```

## Testing Requirements

All features must be tested end-to-end before marking as complete:

1. **Use browser automation** (Playwright/Puppeteer MCP)
2. **Test as a human would** - interact with UI, not just API
3. **Take screenshots** as evidence
4. **Verify all steps** in feature definition

```typescript
// Example test using Playwright MCP
await browser_navigate({ url: 'http://localhost:3000' });
await browser_click({ selector: '#new-chat' });
await browser_type({ selector: '#message', text: 'Hello!' });
await browser_press_key({ key: 'Enter' });
await browser_wait_for({ selector: '.response' });
const result = await browser_snapshot();
```

## Failure Modes and Solutions

| Problem | Solution |
|---------|----------|
| Agent declares victory too early | Feature list with all requirements marked as failing |
| Agent leaves bugs/undocumented progress | Read progress file + git logs at session start; verify with E2E tests |
| Agent marks features done prematurely | Require end-to-end testing with browser automation |
| Agent doesn't know how to run app | Initializer creates init.sh script |

## Known Limitations

- Browser-native alert modals may not be visible through Puppeteer MCP
- Visual bugs may be missed without careful screenshot review
- Very long projects may need periodic progress file cleanup

## Future Directions

- Multi-agent architecture (specialized testing, QA, cleanup agents)
- Generalization beyond web app development
- Scientific research and financial modeling applications

## References

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Anthropic Engineering Blog
- [riv2025-long-horizon-coding-agent-demo](https://github.com/anthropics/riv2025-long-horizon-coding-agent-demo) - Reference implementation (AWS re:Invent 2025)
- [Claude 4 Prompting Guide](https://docs.anthropic.com/claude/docs/prompting-claude-4) - Multi-context window workflows

## Getting Started

### Quick Start (5 Minutes)

```bash
# 1. 复制项目模板
cp -r examples/web-app-template my-project
cd my-project

# 2. 编辑 app_spec.txt 描述你的项目
# 3. 启动初始化代理
claude --prompt-file ../agents/initializer-agent-enhanced.md

# 4. 初始化完成后，启动编码代理
claude --prompt-file ../agents/coding-agent-enhanced.md
```

### 项目结构

```
your-project/
├── .agent/                      # 代理状态文件
│   ├── agent_state.json        # 状态机状态
│   ├── feature_list.json       # 功能列表
│   ├── tests.json              # 测试要求
│   ├── claude-progress.txt     # 会话日志
│   ├── screenshots/            # 测试截图
│   └── console-logs/           # 控制台日志
├── app_spec.txt                 # 项目规格
├── init.sh                      # 开发环境启动脚本
└── [你的应用代码...]
```

### 代理类型

| 代理 | 提示词文件 | 使用时机 |
|------|-----------|---------|
| Initializer | `agents/initializer-agent-enhanced.md` | 项目首次初始化 |
| Coding | `agents/coding-agent-enhanced.md` | 所有后续编码会话 |

### 状态机

| 状态 | 含义 |
|------|------|
| `continuous` | 持续运行会话 |
| `run_once` | 运行一次后暂停 |
| `pause` | 等待人工指令 |
| `terminated` | 代理停止 |

### 示例项目

查看 `examples/web-app-template/` 获取完整的项目模板示例。

---

## Related Resources

- [Anthropic 论文原文](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [YokeFlow 实现](https://github.com/jeffjacobsen/yokeflow2) - 生产级实现
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python) - 官方SDK
- [Claude Cookbooks](https://github.com/anthropics/claude-cookbooks/tree/main/claude_agent_sdk) - 官方示例

---

## License

MIT
