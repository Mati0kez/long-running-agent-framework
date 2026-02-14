# Long-Running Agent Framework - 部署指南

## 快速部署

### 步骤 1: 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. 仓库名称: `long-running-agent-framework`
3. 描述: `AI Agent Framework for Multi-Context Window Development`
4. 选择 Public
5. **不要**勾选 "Add a README file"
6. 点击 "Create repository"

### 步骤 2: 推送代码

```bash
cd D:\long-running-agent-framework

# 添加远程仓库
git remote add origin https://github.com/Mati0kez/long-running-agent-framework.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步骤 3: 克隆到其他机器

```bash
# 在其他机器上克隆
git clone https://github.com/Mati0kez/long-running-agent-framework.git

# 或指定位置
git clone https://github.com/Mati0kez/long-running-agent-framework.git D:\long-running-agent-framework
```

### 步骤 2: 创建全局 Skill

在 Claude Code 中创建全局 skill，以便在任何项目中使用此框架。

**创建文件**: `~/.claude/skills/lra.md`

```markdown
# lra - Long-Running Agent Framework

使用 Long-Running Agent Framework 初始化项目并启动长时间运行的编码代理。

## 框架位置

D:\long-running-agent-framework\

## 用法

### 初始化项目
/user: lra init [项目路径]

执行步骤:
1. 在目标目录创建 .agent/ 结构
2. 复制模板文件
3. 生成 init.sh 和 CLAUDE.md

### 启动编码代理
/user: lra coding

执行步骤:
1. 读取 .agent/feature_list.json
2. 加载编码代理提示
3. 开始 4 步工作流

### 检查状态
/user: lra status

显示当前项目代理状态。

## 4步工作流

Step 1: Init Environment → Step 2: Select Task → Step 3: Write Code → Step 4: Verify

## 代理提示文件
- 编码: D:\long-running-agent-framework\agents\coding-agent-enhanced.md
- 初始化: D:\long-running-agent-framework\agents\initializer-agent-enhanced.md
```

### 步骤 3: 添加到 PATH (可选)

**Windows**:
1. 打开「系统属性」→「环境变量」
2. 编辑 `Path` 变量
3. 添加: `D:\long-running-agent-framework\bin`

**Linux/macOS**:
```bash
echo 'export PATH="$PATH:/path/to/long-running-agent-framework/bin"' >> ~/.bashrc
source ~/.bashrc
```

### 步骤 4: 验证安装

```bash
# 测试 CLI
lra

# 在测试项目中初始化
mkdir test-project && cd test-project
lra init
```

---

## 在新项目中使用

### 1. 初始化框架

```bash
cd /path/to/your/project
lra init
```

这会创建:
```
项目目录/
├── .agent/
│   ├── agent_state.json
│   ├── feature_list.json
│   ├── screenshots/
│   └── console-logs/
├── init.sh
└── CLAUDE.md
```

### 2. 编辑项目规格

编辑 `CLAUDE.md` 描述你的项目:
```markdown
# Project: My App

## Description
A web application for...

## Tech Stack
- TypeScript
- React
- Node.js
```

### 3. 定义功能列表

编辑 `.agent/feature_list.json`:
```json
{
  "projectName": "My App",
  "features": [
    {
      "id": "F001",
      "description": "User can login",
      "steps": ["Navigate to login", "Enter credentials", "Click submit"],
      "passes": false,
      "priority": 10
    }
  ]
}
```

### 4. 启动编码代理

```bash
claude --prompt-file D:\long-running-agent-framework\agents\coding-agent-enhanced.md
```

---

## 配置 MCP 服务

为了完整使用框架功能，确保以下 MCP 服务已配置:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "type": "stdio"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
      "type": "stdio"
    },
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "type": "stdio"
    }
  }
}
```

---

## 目录结构

```
D:\long-running-agent-framework\
├── bin/
│   ├── lra.cmd              # Windows CLI
│   └── lra                  # Unix CLI
├── core/
│   ├── orchestrator.ts      # 主编排逻辑
│   ├── workflow-engine.ts   # 4步工作流引擎
│   ├── test-phase.ts        # 测试阶段组件
│   ├── feature-manager.ts   # 功能列表管理
│   ├── progress-tracker.ts  # 进度文件管理
│   ├── session-manager.ts   # 会话生命周期
│   ├── agent-coordinator.ts # 代理协调
│   ├── state-manager.ts     # 状态机
│   ├── test-manager.ts      # 测试管理
│   ├── backlog-manager.ts   # 人工请求跟踪
│   └── index.ts             # 导出
├── agents/
│   ├── coding-agent-enhanced.md     # 编码代理 (4步工作流)
│   ├── initializer-agent-enhanced.md # 初始化代理
│   ├── coding-agent.md              # 基础编码代理
│   ├── initializer-agent.md         # 基础初始化代理
│   └── testing-agent.md             # 测试代理
├── templates/
│   └── feature-list.json    # 功能列表示例
├── examples/
│   └── web-app-template/    # Web应用模板
├── utils/
│   └── cli.ts               # CLI工具
├── README.md                # 主要文档
├── AI-CONTEXT.md            # AI可读文档
├── DEPLOYMENT.md            # 本部署指南
├── INSTALL.md               # 安装说明
├── QUICKSTART.md            # 快速开始
├── package.json
└── tsconfig.json
```

---

## 故障排除

### 问题: lra 命令找不到

**解决方案**: 使用完整路径或添加到 PATH
```bash
D:\long-running-agent-framework\bin\lra.cmd init
```

### 问题: 代理无法启动开发服务器

**解决方案**: 检查 init.sh 权限和内容
```bash
chmod +x init.sh
./init.sh
```

### 问题: Playwright 测试失败

**解决方案**: 确保浏览器已安装
```bash
npx playwright install
```

---

## 更新框架

```bash
cd D:\long-running-agent-framework
git pull origin main
```
