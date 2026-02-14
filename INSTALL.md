# Long-Running Agent Framework - 安装与使用

## 位置
```
D:\long-running-agent-framework\
```

## 添加到系统 PATH（可选）

### Windows
1. 打开「系统属性」→「环境变量」
2. 在「用户变量」中找到 `Path`，点击「编辑」
3. 添加路径：`D:\long-running-agent-framework\bin`
4. 重启终端

### 或者直接使用
```cmd
# 不添加 PATH 的情况下直接使用
D:\long-running-agent-framework\bin\lra.cmd init
```

## 快速使用

### 1. 在新项目中初始化框架
```bash
cd D:\毕设项目代码库\your-new-project
D:\long-running-agent-framework\bin\lra.cmd init
```

### 2. 启动编码代理
```bash
claude --prompt-file D:\long-running-agent-framework\agents\coding-agent-enhanced.md
```

### 3. 启动初始化代理（首次运行）
```bash
claude --prompt-file D:\long-running-agent-framework\agents\initializer-agent-enhanced.md
```

## 目录结构

```
D:\long-running-agent-framework\
├── bin/
│   ├── lra.cmd          # Windows CLI
│   └── lra              # Unix CLI
├── core/
│   ├── orchestrator.ts
│   ├── workflow-engine.ts   # 4步工作流引擎
│   ├── test-phase.ts        # 测试阶段组件
│   ├── feature-manager.ts
│   ├── progress-tracker.ts
│   ├── session-manager.ts
│   ├── agent-coordinator.ts
│   ├── state-manager.ts
│   ├── test-manager.ts
│   ├── backlog-manager.ts
│   └── index.ts
├── agents/
│   ├── coding-agent-enhanced.md   # 编码代理（4步工作流）
│   ├── coding-agent.md
│   ├── initializer-agent-enhanced.md
│   ├── initializer-agent.md
│   └── testing-agent.md
├── templates/
│   └── feature-list.json
├── examples/
│   └── web-app-template/
├── utils/
│   └── cli.ts
├── README.md
├── QUICKSTART.md
├── package.json
└── tsconfig.json
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `lra init [path]` | 在指定目录初始化框架 |
| `lra status` | 显示当前项目状态 |
| `lra prompt [type]` | 显示代理提示文件路径 |

## 在当前项目中使用

要在 `D:\毕设项目代码库` 中创建新项目并使用此框架：

```bash
# 1. 创建新项目目录
mkdir D:\毕设项目代码库\my-new-app
cd D:\毕设项目代码库\my-new-app

# 2. 初始化框架
D:\long-running-agent-framework\bin\lra.cmd init

# 3. 编辑项目描述
# 编辑 CLAUDE.md 和 .agent/feature_list.json

# 4. 启动编码代理
claude --prompt-file D:\long-running-agent-framework\agents\coding-agent-enhanced.md
```
