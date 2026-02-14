# lra-dev - 使用 LRA 框架开发项目

使用 Long-Running Agent Framework 进行长时间运行的 AI 辅助开发。

## 配置

**使用前需要设置框架路径：**

将下方所有 `<LRA_PATH>` 替换为你的实际框架安装路径。

## 用法

### 初始化新项目
在目标目录创建 `.agent/` 结构和必要配置文件。

### 启动编码会话
加载编码代理提示，开始 4 步工作流开发。

### 检查项目状态
显示当前项目的代理状态和进度。

## 4 步工作流

```
┌─────────────────────────────────────────────────────────────┐
│                     4-STEP WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│  Step 1: Init Environment                                   │
│  ├── 运行 ./init.sh                                          │
│  └── 验证 localhost:3000 运行中                              │
│                ↓                                            │
│  Step 2: Select Task                                        │
│  ├── 读取 .agent/feature_list.json                          │
│  └── 选择最高优先级未完成功能                                 │
│                ↓                                            │
│  Step 3: Write Code                                         │
│  └── 实现选定的功能                                          │
│                ↓                                            │
│  Step 4: Verify (Test Phase)                                │
│  ├── npm run lint                                           │
│  ├── npm run build                                          │
│  ├── Browser tests (Playwright)                             │
│  └── 失败 → 循环回 Step 3                                    │
└─────────────────────────────────────────────────────────────┘
```

## 执行指令

当用户说：
- `初始化项目` 或 `lra init` → 在当前目录初始化框架
- `开始开发` 或 `lra dev` 或 `lra coding` → 启动编码代理
- `项目状态` 或 `lra status` → 显示代理状态
- `查看功能列表` 或 `lra features` → 显示功能进度

## 初始化项目操作

1. 确认当前目录是项目根目录
2. 创建目录结构:
   ```
   .agent/
   ├── agent_state.json      # 代理状态机
   ├── feature_list.json     # 功能列表
   ├── tests.json            # 测试用例
   ├── claude-progress.txt   # 会话日志
   ├── screenshots/          # 测试截图
   └── console-logs/         # 控制台日志
   init.sh                   # 开发环境启动脚本
   CLAUDE.md                 # 项目规格说明
   ```
3. 从模板复制初始文件: `<LRA_PATH>/templates/`
4. 创建 init.sh（如不存在）
5. 创建 CLAUDE.md 模板（如不存在）

## 启动编码代理操作

1. 验证 `.agent/` 目录存在
2. 执行启动例程:
   ```bash
   pwd                                    # 确认目录
   cat .agent/claude-progress.txt         # 读取进度
   git log --oneline -20                  # 读取提交历史
   cat .agent/feature_list.json           # 读取功能列表
   ./init.sh                              # 启动开发服务器
   ```
3. 选择下一个未完成功能
4. 实现 → 测试 → 提交循环

## 代理提示文件

| 代理类型 | 文件路径 |
|---------|---------|
| 编码代理 | `<LRA_PATH>/agents/coding-agent-enhanced.md` |
| 初始化代理 | `<LRA_PATH>/agents/initializer-agent-enhanced.md` |
| 测试代理 | `<LRA_PATH>/agents/testing-agent.md` |

## 功能实现流程

### Step 1: 选择功能
- 从 feature_list.json 选择 `passes: false` 的功能
- 按优先级排序选择最高优先级

### Step 2: 实现功能
- 只处理一个功能
- 遵循现有代码模式
- 保持函数小于 50 行

### Step 3: 测试验证
```bash
npm run lint
npm run build
# Playwright 浏览器测试
```

### Step 4: 记录进度
- 更新 feature_list.json
- 更新 claude-progress.txt
- Git 提交

## 关键规则

| 规则 | 原因 |
|-----|------|
| 每会话只处理一个功能 | 保证增量进度 |
| 必须通过测试才能标记完成 | 防止假阳性 |
| 测试需要截图+控制台日志证据 | 防止过早完成 |
| 每完成功能必须 Git 提交 | 可追溯性 |
| 不删除/修改现有测试 | 防止隐藏 bug |

## 会话结束检查清单

- [ ] 功能端到端测试通过
- [ ] 无控制台错误
- [ ] 截图已保存
- [ ] feature_list.json 已更新
- [ ] claude-progress.txt 已更新
- [ ] Git 已提交

## 参考文档

- AI 可读文档: `<LRA_PATH>/AI-CONTEXT.md`
- 编码代理提示: `<LRA_PATH>/agents/coding-agent-enhanced.md`
- 功能列表示例: `<LRA_PATH>/templates/feature-list.json`
