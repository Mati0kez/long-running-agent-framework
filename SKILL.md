# lra - Long-Running Agent Framework

使用 Long-Running Agent Framework 初始化项目并启动长时间运行的编码代理。

## 框架位置

```
D:\long-running-agent-framework\
```

## 用法

### 初始化项目
```bash
lra init [项目路径]
```
在指定目录初始化框架，创建 `.agent/` 目录结构和必要的配置文件。

### 检查状态
```bash
lra status
```
显示当前项目的代理状态。

### 获取代理提示
```bash
lra prompt [类型]
```
类型: `coding` | `initializer` | `testing`

## 4步工作流

```
Step 1: Init Environment (./init.sh → localhost:3000)
           ↓
Step 2: Select Task (feature_list.json)
           ↓
Step 3: Write Code (implement feature)
           ↓
Step 4: Verify (lint → build → browser)
           ┌─────────────────┐
           │  All Passed?    │
           │  ┌─────┴─────┐  │
           │ YES         NO  │
           │  ↓           │  │
           │ Continue  Loop  │
           └─────────────────┘
```

## 启动编码代理

初始化后，运行：
```bash
claude --prompt-file D:\long-running-agent-framework\agents\coding-agent-enhanced.md
```

## 文件结构

```
项目目录/
├── .agent/
│   ├── agent_state.json      # 代理状态机
│   ├── feature_list.json     # 功能列表
│   ├── tests.json            # 测试用例
│   ├── claude-progress.txt   # 会话日志
│   ├── screenshots/          # 测试截图
│   └── console-logs/         # 控制台日志
├── init.sh                   # 开发环境启动脚本
└── CLAUDE.md                 # 项目规格说明
```

## 示例

```bash
# 在新项目中初始化
cd /path/to/new-project
lra init

# 启动编码代理
claude --prompt-file D:\long-running-agent-framework\agents\coding-agent-enhanced.md
```
