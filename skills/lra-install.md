# lra-install - 安装 Long-Running Agent Framework

从 GitHub 安装 Long-Running Agent Framework 到本地系统。

## GitHub 仓库

```
https://github.com/Mati0kez/long-running-agent-framework
```

## 默认安装位置

```
D:\long-running-agent-framework\
```

## 用法

### 安装框架
将框架克隆到本地并配置全局 skill。

### 添加到 PATH
将框架 bin 目录添加到系统 PATH（可选）。

### 验证安装
检查框架是否正确安装。

## 执行指令

当用户说：
- `安装 lra 框架` 或 `install lra` → 执行完整安装流程
- `更新 lra 框架` 或 `update lra` → 从 GitHub 拉取最新版本
- `验证 lra 安装` 或 `verify lra` → 检查安装状态

## 安装操作步骤

### 步骤 1: 克隆仓库

```bash
git clone https://github.com/Mati0kez/long-running-agent-framework.git D:\long-running-agent-framework
```

### 步骤 2: 验证文件完整性

确认以下目录存在：
- `D:\long-running-agent-framework\core\` (11个核心模块)
- `D:\long-running-agent-framework\agents\` (5个代理模板)
- `D:\long-running-agent-framework\bin\` (CLI工具)
- `D:\long-running-agent-framework\templates\`

### 步骤 3: 创建全局 Skill（可选）

创建文件 `~/.claude/skills/lra.md`:
- 内容来自 `D:\long-running-agent-framework\SKILL.md`

### 步骤 4: 添加到 PATH（可选）

**Windows:**
1. 打开「系统属性」→「环境变量」
2. 编辑 `Path` 变量
3. 添加: `D:\long-running-agent-framework\bin`

### 步骤 5: 验证

```bash
# 测试 CLI
D:\long-running-agent-framework\bin\lra.cmd

# 应显示使用帮助
```

## 更新操作步骤

```bash
cd D:\long-running-agent-framework
git pull origin main
```

## 安装验证清单

- [ ] 框架目录存在
- [ ] core/ 目录包含 11 个 .ts 文件
- [ ] agents/ 目录包含 5 个 .md 文件
- [ ] bin/ 目录包含 lra 和 lra.cmd
- [ ] lra 命令可执行
- [ ] 全局 skill 已创建（可选）

## 依赖要求

- Git
- Node.js (v18+)
- Claude Code CLI

## 参考文档

- 部署指南: `D:\long-running-agent-framework\DEPLOYMENT.md`
- 安装说明: `D:\long-running-agent-framework\INSTALL.md`
- AI 可读文档: `D:\long-running-agent-framework\AI-CONTEXT.md`
