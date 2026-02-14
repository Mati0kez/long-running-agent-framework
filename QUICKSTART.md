# Quick Start Guide

## Long-Running Agent Framework

基于 [Anthropic 研究](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 的长时间运行代理框架。

---

## 🚀 5分钟快速开始

### 1. 复制项目模板

```bash
# 复制模板到你的项目目录
cp -r long-running-agent-framework/examples/web-app-template my-project
cd my-project
```

### 2. 创建项目规格

编辑 `app_spec.txt`，描述你想要构建的应用：

```markdown
# My Application Specification

## Project: [Your App Name]

[Brief description of what you want to build]

## Core Features
- Feature 1: [Description]
- Feature 2: [Description]
- ...

## Tech Stack
- Frontend: React, TypeScript
- Backend: Node.js, Express
- Database: PostgreSQL
```

### 3. 启动初始化代理

**使用 Claude Code CLI：**

```bash
# 启动初始化代理
claude --prompt-file long-running-agent-framework/agents/initializer-agent-enhanced.md
```

**或手动加载提示词：**

1. 打开 Claude Code
2. 复制 `agents/initializer-agent-enhanced.md` 内容
3. 粘贴作为第一条消息

### 4. 代理将自动：

1. ✅ 读取 `app_spec.txt`
2. ✅ 创建 `feature_list.json` (150-300个功能)
3. ✅ 创建 `tests.json` (测试要求)
4. ✅ 创建 `init.sh` (开发环境脚本)
5. ✅ 初始化 `claude-progress.txt`
6. ✅ 创建初始 Git 提交

### 5. 开始编码会话

```bash
# 启动编码代理
claude --prompt-file long-running-agent-framework/agents/coding-agent-enhanced.md
```

---

## 📂 项目结构

```
my-project/
├── .agent/                      # 代理状态文件
│   ├── agent_state.json        # 状态机状态
│   ├── feature_list.json       # 功能列表 (200+功能)
│   ├── tests.json              # 测试要求
│   ├── claude-progress.txt     # 会话日志
│   ├── screenshots/            # 测试截图
│   └── console-logs/           # 控制台日志
├── app_spec.txt                 # 项目规格说明
├── init.sh                      # 开发环境启动脚本
├── .gitignore
└── [你的应用代码...]
```

---

## 🔄 工作流程

### 初始化阶段 (Session 0)

```
app_spec.txt → Initializer Agent → feature_list.json
                              → tests.json
                              → init.sh
                              → claude-progress.txt
```

### 编码阶段 (Sessions 1+)

```
每个会话:
┌─────────────────────────────────────┐
│ 1. pwd                              │
│ 2. cat claude-progress.txt          │
│ 3. git log --oneline -20            │
│ 4. cat feature_list.json            │
│ 5. ./init.sh                        │
│ 6. 选择下一个未完成的功能           │
│ 7. 实现 → 测试 → 验证               │
│ 8. git commit                       │
│ 9. 更新进度文件                     │
└─────────────────────────────────────┘
```

---

## 🎯 状态机

| 状态 | 含义 | 使用场景 |
|------|------|----------|
| `continuous` | 持续运行 | 自动化开发 |
| `run_once` | 运行一次后暂停 | 单个功能开发 |
| `pause` | 等待指令 | 人工干预 |
| `terminated` | 停止 | 项目完成 |

**修改状态：**
```bash
# 暂停代理
echo '{"desired_state":"pause","current_state":"pause"}' > .agent/agent_state.json

# 启动持续模式
echo '{"desired_state":"continuous","current_state":"continuous"}' > .agent/agent_state.json
```

---

## 📊 监控进度

### 查看功能完成情况

```bash
# 总进度
cat .agent/feature_list.json | grep -c '"passes": true'
cat .agent/feature_list.json | grep -c '"passes": false'

# 按类别统计
cat .agent/feature_list.json | jq '.features | group_by(.category) | map({category: .[0].category, count: length})'
```

### 查看会话历史

```bash
cat .agent/claude-progress.txt
```

### 查看测试结果

```bash
cat .agent/tests.json | grep -c '"passes": true'
```

---

## ⚠️ 关键规则

### ✅ 必须做

| 规则 | 原因 |
|------|------|
| 每个功能必须端到端测试 | 确保功能真正可用 |
| 使用 Playwright MCP 测试 UI | 模拟真实用户行为 |
| 每个功能完成后 git commit | 进度可追溯 |
| 更新进度文件 | 下一个会话需要上下文 |
| 代码必须干净无 bug | 不留技术债务 |

### ❌ 禁止做

| 规则 | 原因 |
|------|------|
| 删除或修改现有测试 | 可能隐藏 bug |
| 未经测试标记功能完成 | 虚假进度 |
| 一次实现多个功能 | 增量进度丢失 |
| 跳过启动检查 | 缺少上下文 |

---

## 🔧 高级配置

### 环境变量

```bash
# .env
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
```

### 自定义功能类别

在 `feature_list.json` 中添加自定义类别：

```json
{
  "categories": {
    "custom": "自定义功能类别"
  }
}
```

---

## 📚 相关资源

- [Anthropic 论文原文](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [YokeFlow 实现](https://github.com/jeffjacobsen/yokeflow2)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)

---

## 🆘 常见问题

### Q: 代理不知道从哪里开始？

**A:** 检查 `claude-progress.txt` 最后一条记录的 "Next Steps" 部分。

### Q: 功能标记完成但实际上不工作？

**A:** 检查 `.agent/screenshots/` 中的测试截图，确保测试是真实的端到端测试。

### Q: 上下文窗口满了怎么办？

**A:** 使用 `/compact` 命令压缩上下文，或开始新会话（代理会从进度文件恢复）。

### Q: 如何回滚错误的更改？

**A:** 使用 `git log` 找到正确的提交，然后 `git reset --hard <commit-hash>`。

---

**祝你的长时间运行代理项目成功！**
