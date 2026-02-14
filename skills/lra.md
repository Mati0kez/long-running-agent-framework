# lra - Long-Running Agent Framework 入口

Long-Running Agent Framework 的主入口 skill。用于管理长时间运行的 AI 编码代理。

## 子 Skills

| Skill | 用途 | 触发词 |
|-------|------|--------|
| `lra-install` | 安装/更新框架 | `安装 lra`, `install lra`, `更新 lra` |
| `lra-dev` | 使用框架开发 | `lra init`, `lra dev`, `开始开发` |

## 快速命令

| 命令 | 操作 |
|------|------|
| `lra install` | 安装框架到本地 |
| `lra update` | 更新框架到最新版本 |
| `lra init` | 在当前项目初始化框架 |
| `lra dev` | 启动编码代理进行开发 |
| `lra status` | 检查项目代理状态 |

## 执行指令

当用户说：
- `安装 lra` 或 `lra install` → 调用 `lra-install` skill
- `更新 lra` 或 `lra update` → 调用 `lra-install` skill (更新模式)
- `初始化项目` 或 `lra init` → 调用 `lra-dev` skill (初始化模式)
- `开始开发` 或 `lra dev` → 调用 `lra-dev` skill (开发模式)
- `项目状态` 或 `lra status` → 调用 `lra-dev` skill (状态检查)

## 框架位置

```
D:\long-running-agent-framework\
```

## GitHub 仓库

```
https://github.com/Mati0kez/long-running-agent-framework
```

## 4 步工作流概览

```
Step 1: Init Environment → Step 2: Select Task → Step 3: Write Code → Step 4: Verify
                                                                      ↓
                                                              All Passed? → Yes: Continue / No: Loop
```
