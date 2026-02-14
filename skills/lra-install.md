# lra-install - 安装 Long-Running Agent Framework

从 GitHub 安装 Long-Running Agent Framework 到本地系统。

## GitHub 仓库

```
https://github.com/Mati0kez/long-running-agent-framework
```

## 配置

**安装前请确定安装路径：**

| 平台 | 建议路径 |
|------|---------|
| Windows | `<安装路径>\long-running-agent-framework` |
| Linux/macOS | `<安装路径>/long-running-agent-framework` |

将下方所有 `<LRA_PATH>` 替换为你的实际安装路径。

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
git clone https://github.com/Mati0kez/long-running-agent-framework.git <LRA_PATH>
```

### 步骤 2: 验证文件完整性

确认以下目录存在：
- `<LRA_PATH>/core/` (11个核心模块)
- `<LRA_PATH>/agents/` (5个代理模板)
- `<LRA_PATH>/bin/` (CLI工具)
- `<LRA_PATH>/templates/`

### 步骤 3: 创建全局 Skill

创建文件 `<Claude配置目录>/skills/lra.md`:
- 内容来自 `<LRA_PATH>/skills/lra.md`

### 步骤 4: 添加到 PATH（可选）

**Windows:**
1. 打开「系统属性」→「环境变量」
2. 编辑 `Path` 变量
3. 添加: `<LRA_PATH>\bin`

**Linux/macOS:**
```bash
echo 'export PATH="$PATH:<LRA_PATH>/bin"' >> ~/.bashrc
source ~/.bashrc
```

### 步骤 5: 验证

```bash
# 测试 CLI
<LRA_PATH>/bin/lra

# 应显示使用帮助
```

## 更新操作步骤

```bash
cd <LRA_PATH>
git pull origin main
```

## 安装验证清单

- [ ] 框架目录存在
- [ ] core/ 目录包含 11 个 .ts 文件
- [ ] agents/ 目录包含 5 个 .md 文件
- [ ] bin/ 目录包含 lra 和 lra.cmd
- [ ] lra 命令可执行
- [ ] 全局 skill 已创建

## 依赖要求

- Git
- Node.js (v18+)
- Claude Code CLI

## 参考文档

- 部署指南: `<LRA_PATH>/DEPLOYMENT.md`
- 安装说明: `<LRA_PATH>/INSTALL.md`
- AI 可读文档: `<LRA_PATH>/AI-CONTEXT.md`
