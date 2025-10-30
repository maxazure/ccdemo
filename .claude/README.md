# Claude Code 自动化多代理协作系统

这是一个完全自动化的多代理开发工作流系统，可以让 Claude Code 从规划到实现再到测试修复，全程无需人工干预。

## 🎯 系统概述

### 功能

使用一个命令，自动完成：
1. **需求分析和规划**（Planner Agent）
2. **代码实现**（Developer Agent）
3. **测试验证**（Tester Agent）
4. **问题调试**（Debugger Agent）
5. **自动修复循环**（测试失败时自动调试和修复）

### 工作流程

```
用户输入: /auto-dev 写一个贪吃蛇游戏

     ↓
┌──────────────────────────────────────────────┐
│  DM (Development Manager) 主协调实例          │
│  - 理解需求                                  │
│  - 协调各个代理                               │
│  - 管理工作流状态                             │
└──────────────────────────────────────────────┘
     ↓
┌──────────────────────────────────────────────┐
│  Phase 1: PLANNER 📋                         │
│  - 分析需求                                   │
│  - 研究现有代码                               │
│  - 制定详细实现计划                           │
└──────────────────────────────────────────────┘
     ↓ (Hook: workflow_dm.py 自动触发)
┌──────────────────────────────────────────────┐
│  Phase 2: DEVELOPER 💻                       │
│  - 按计划实现代码                             │
│  - 创建/修改文件                              │
│  - 遵循最佳实践                               │
└──────────────────────────────────────────────┘
     ↓ (Hook: workflow_dm.py 自动触发)
┌──────────────────────────────────────────────┐
│  Phase 3: TESTER 🧪                          │
│  - 运行自动化测试                             │
│  - 执行手动测试场景                           │
│  - 报告测试结果                               │
└──────────────────────────────────────────────┘
     ↓
   判断测试结果
     ↓
  ┌─────┴─────┐
  │           │
 通过        失败
  │           │
  ↓           ↓ (Hook: workflow_dm.py 自动触发)
完成    ┌──────────────────────────────────┐
        │  Phase 4: DEBUG LOOP 🔄          │
        │  ┌────────────────────────────┐  │
        │  │ DEBUGGER 分析问题          │  │
        │  └────────────────────────────┘  │
        │           ↓                       │
        │  ┌────────────────────────────┐  │
        │  │ DEVELOPER 修复问题         │  │
        │  └────────────────────────────┘  │
        │           ↓                       │
        │  ┌────────────────────────────┐  │
        │  │ TESTER 重新测试            │  │
        │  └────────────────────────────┘  │
        │           ↓                       │
        │    (循环直到通过或达到最大次数)    │
        └──────────────────────────────────┘
                    ↓
              最终完成报告
```

## 📁 文件结构

```
.claude/
├── agents/                    # 专门化的子代理配置
│   ├── planner.md            # 规划师 - 分析需求，制定计划
│   ├── developer.md          # 开发者 - 编写代码
│   ├── tester.md             # 测试员 - 运行测试，验证功能
│   └── debugger.md           # 调试员 - 分析问题，提供修复方案
│
├── commands/                  # 自定义 slash 命令
│   └── auto-dev.md           # 主自动化工作流命令
│
├── hooks/                     # Hook 脚本（自动化逻辑）
│   ├── workflow_dm.py        # DM 决策引擎
│   └── test_checker.py       # 测试状态监控
│
├── settings.json             # Claude Code 配置
└── README.md                 # 本文档
```

## 🚀 快速开始

### 1. 确保 Python 可用

Hook 脚本需要 Python 3.6+：

```bash
python --version
# 或
python3 --version
```

### 2. 启动 Claude Code

```bash
cd /path/to/your/project
claude
```

### 3. 使用自动化工作流

在 Claude Code 中执行：

```
/auto-dev 写一个贪吃蛇游戏
```

或者：

```
/auto-dev 添加用户认证功能，使用 JWT 令牌
```

### 4. 等待完成

系统会自动：
- 规划实现方案
- 编写代码
- 运行测试
- 如果测试失败，自动调试和修复（最多 5 次迭代）
- 提供最终报告

**全程无需人工干预！**

## 🔧 系统架构

### 三层架构设计

#### Layer 1: 外部编排（可选）

使用 Headless Mode 进行更高级的控制：

```bash
# 完全自动化执行
claude -p "/auto-dev 添加搜索功能" --max-turns 50

# 或使用脚本进行更复杂的编排
./scripts/autonomous_dev.sh "添加搜索功能"
```

#### Layer 2: Claude Code 主实例 + Hooks

- **主实例**：作为 DM（Development Manager），理解上下文并协调
- **Hooks**：提供确定性的流程控制

**关键 Hooks：**

1. **SubagentStop Hook**（`workflow_dm.py`）
   - 在每个子代理完成后触发
   - 分析当前状态（哪个代理完成了？测试通过了吗？）
   - 决定下一步行动
   - 通过 `"decision": "block"` 强制继续工作流

2. **PostToolUse Hook**（`test_checker.py`）
   - 监控 Bash 工具的测试命令执行
   - 识别测试结果
   - 提供额外的反馈

#### Layer 3: 专门化的 Subagents

每个子代理有：
- **独立的上下文窗口**（不会污染主会话）
- **专门的系统提示**（针对特定角色优化）
- **受限的工具访问**（安全和效率）
- **特定的模型选择**（根据任务复杂度）

### Hook 决策逻辑

`workflow_dm.py` 的核心决策表：

| 完成的代理 | 测试状态 | 调试迭代次数 | 下一步行动 |
|-----------|---------|-------------|-----------|
| Planner | - | - | → Developer (实现) |
| Developer | - | 0 | → Tester (首次测试) |
| Developer | - | >0 | → Tester (重新测试) |
| Tester | PASSED | - | ✅ 完成 |
| Tester | FAILED | <5 | → Debugger (分析) |
| Tester | FAILED | ≥5 | ⚠️ 达到最大次数，停止 |
| Debugger | - | - | → Developer (修复) |

## 🎮 使用示例

### 示例 1: 创建游戏

```
/auto-dev 创建一个简单的井字棋游戏，使用 HTML/CSS/JavaScript，包含 AI 对手
```

**系统会自动：**
1. 规划游戏架构（HTML 结构、CSS 样式、JS 逻辑、AI 算法）
2. 实现完整的游戏代码
3. 运行测试（如果有）或进行功能验证
4. 修复任何发现的问题
5. 输出最终报告

### 示例 2: 添加功能

```
/auto-dev 为现有的 Express API 添加用户注册和登录功能，使用 bcrypt 加密密码
```

**系统会：**
1. 分析现有的 Express 应用结构
2. 设计认证方案
3. 实现注册/登录端点
4. 添加密码加密
5. 运行测试
6. 修复集成问题

### 示例 3: 修复问题

```
/auto-dev 修复购物车中的数量计算错误，确保负数和非法输入被正确处理
```

## ⚙️ 配置和定制

### 调整最大调试迭代次数

编辑 `.claude/hooks/workflow_dm.py`：

```python
MAX_DEBUG_ITERATIONS = 5  # 改为你想要的次数
```

### 修改子代理行为

编辑对应的 `.claude/agents/*.md` 文件：

```markdown
---
name: developer
tools: Read, Write, Edit, Grep, Glob, Bash  # 添加或移除工具
model: opus  # 改为 opus 获得更高质量（但更慢更贵）
---

你的自定义系统提示...
```

### 添加自定义代理

创建 `.claude/agents/my-agent.md`：

```markdown
---
name: my-agent
description: 简短描述，告诉主实例何时使用这个代理
tools: Read, Grep
model: sonnet
---

你是一个专家...
```

然后在 `/auto-dev` 命令中添加对这个代理的调用。

### 禁用自动化（手动模式）

如果你想手动控制工作流，可以：

1. **临时禁用**：重命名 `settings.json`
   ```bash
   mv .claude/settings.json .claude/settings.json.disabled
   ```

2. **选择性使用**：直接调用单个代理
   ```
   Use the planner agent to analyze this feature: [describe feature]
   ```

## 🔍 监控和调试

### 查看 Hook 日志

Hook 脚本会输出日志到 stderr：

```bash
# 如果使用 headless mode，日志会显示
claude -p "/auto-dev test" 2>&1 | grep "Workflow DM"
```

### 查看工作流状态

在 `/auto-dev` 执行过程中，主 Claude 实例会：
- 显示当前阶段
- 报告每个代理的输出
- 说明下一步行动

### 调试 Hook 脚本

测试 `workflow_dm.py`：

```bash
# 创建测试输入
echo '{"transcript_path": "path/to/transcript.txt"}' | python .claude/hooks/workflow_dm.py
```

## 📊 性能和成本

### Token 使用

- **主实例**：包含完整的工作流上下文
- **每个子代理**：独立上下文窗口，只包含相关信息
- **优势**：总 token 使用通常比单会话更少（因为上下文隔离）

### 典型成本（以贪吃蛇游戏为例）

假设使用 Sonnet：
- Planner: ~5K tokens
- Developer: ~15K tokens
- Tester: ~5K tokens
- Debugger (如果需要): ~8K tokens × 迭代次数
- Developer fixes: ~10K tokens × 迭代次数

**总计**：约 25K-50K tokens（取决于是否需要调试）

### 速度

- **规划**: 10-30 秒
- **实现**: 30-90 秒
- **测试**: 10-30 秒（包括运行时间）
- **调试+修复**: 40-80 秒/迭代

**总耗时**：2-10 分钟（取决于复杂度和迭代次数）

## 🚨 故障排除

### Hook 不工作

**问题**: 子代理完成后没有自动继续

**解决方案**:
1. 检查 Python 是否可用：`python --version`
2. 检查 hook 脚本是否可执行
3. 查看 settings.json 中的路径是否正确
4. 确保使用相对路径或正确的绝对路径

### 工作流卡住

**问题**: 工作流在某个阶段停止

**解决方案**:
1. 检查最近的输出 - DM 说了什么？
2. 手动执行下一步：`Use the [agent] agent to ...`
3. 查看 hook 日志：错误会输出到 stderr
4. 临时禁用 hooks 并手动协调

### 测试循环不停止

**问题**: 达到最大迭代次数但仍然失败

**原因**: 某些问题可能需要人工干预

**解决方案**:
1. 查看最后的调试分析
2. 手动审查失败的测试
3. 使用标准的 Claude Code 进行人工修复
4. 或增加最大迭代次数

### Agent 产生的输出不符合预期

**问题**: Agent 没有按照预期工作

**解决方案**:
1. 编辑对应的 `.claude/agents/*.md` 文件
2. 改进系统提示
3. 添加更多具体的指令和示例
4. 调整工具权限

## 🎯 最佳实践

### 1. 清晰的需求描述

✅ **好的**:
```
/auto-dev 创建一个 REST API 端点 /api/users/:id，支持 GET 和 PUT 请求，
使用 Express 和 PostgreSQL，包含输入验证和错误处理
```

❌ **不好的**:
```
/auto-dev 做一个用户 API
```

### 2. 指定技术栈

```
/auto-dev 使用 React + TypeScript + Tailwind 创建一个响应式的用户资料页面
```

### 3. 说明测试要求

```
/auto-dev 实现一个密码验证函数，要求至少 8 个字符，包含大小写字母和数字，
并编写完整的单元测试
```

### 4. 分解大型任务

对于非常复杂的功能，考虑分多次执行：

```
# 第一次
/auto-dev 创建用户数据模型和数据库 schema

# 第二次
/auto-dev 实现用户注册和登录 API 端点

# 第三次
/auto-dev 添加用户资料页面 UI
```

## 🔮 高级用法

### Headless Mode 脚本编排

创建 `scripts/auto_dev.sh`：

```bash
#!/bin/bash

FEATURE="$1"
MAX_ATTEMPTS=3

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Attempt $i of $MAX_ATTEMPTS"

  result=$(claude -p "/auto-dev $FEATURE" --max-turns 50 --output-format json)

  # 检查是否成功
  if echo "$result" | jq -e '.success == true' > /dev/null; then
    echo "Success!"
    exit 0
  fi

  echo "Attempt $i failed, retrying..."
done

echo "Failed after $MAX_ATTEMPTS attempts"
exit 1
```

使用：
```bash
./scripts/auto_dev.sh "添加导出为 PDF 功能"
```

### CI/CD 集成

在 GitHub Actions 中使用：

```yaml
# .github/workflows/auto-dev.yml
name: Auto Development

on:
  issues:
    types: [labeled]

jobs:
  auto-dev:
    if: github.event.label.name == 'auto-implement'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run auto-dev
        run: |
          claude -p "/auto-dev ${{ github.event.issue.title }}: ${{ github.event.issue.body }}" \
            --max-turns 50
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: "Auto-implemented: ${{ github.event.issue.title }}"
```

### 自定义工作流

创建 `.claude/commands/my-workflow.md`：

```markdown
---
description: 我的自定义开发工作流
---

1. Use the planner agent...
2. Use my-custom-agent to...
3. Use the developer agent...
4. ...
```

## 📚 扩展阅读

- [Claude Code 官方文档](https://docs.claude.com/en/docs/claude-code)
- [Subagents 指南](https://docs.claude.com/en/docs/claude-code/subagents)
- [Hooks 参考](https://docs.claude.com/en/docs/claude-code/hooks)
- [Slash Commands](https://docs.claude.com/en/docs/claude-code/commands)

## 🤝 贡献和反馈

这个系统是实验性的，随着 Claude Code 的发展会不断改进。

欢迎：
- 报告问题和 bug
- 建议改进
- 分享你的使用案例
- 贡献新的 agent 配置
- 优化 hook 脚本逻辑

## 📄 许可

这个配置是开源的，你可以自由使用、修改和分发。

---

**享受完全自动化的开发体验！** 🚀

有问题？在你的 Claude Code 会话中问我！
