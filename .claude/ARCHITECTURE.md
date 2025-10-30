# 系统架构详解

## 🏗️ 架构概览

这是一个基于 Claude Code 的自动化多代理协作系统，实现了完全自主的开发工作流。

## 三层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: 外部编排层                        │
│                      （可选的）                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Headless Scripts / CI/CD                           │    │
│  │  - 批量任务执行                                       │    │
│  │  - GitHub Actions 集成                               │    │
│  │  - 自动化测试流水线                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Layer 2: Claude Code 主实例 + Hooks             │
│                   （DM - Development Manager）               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  主 Claude 实例                                        │   │
│  │  - 理解用户需求                                        │   │
│  │  - 协调子代理                                          │   │
│  │  - 传递上下文                                          │   │
│  │  - 做出高层决策                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Hooks (自动化控制层)                                  │   │
│  │                                                        │   │
│  │  SubagentStop Hook (workflow_dm.py)                   │   │
│  │  • 检测哪个代理完成了                                  │   │
│  │  • 分析当前状态                                        │   │
│  │  • 决定下一步行动                                      │   │
│  │  • 通过 "block" 机制强制继续                           │   │
│  │                                                        │   │
│  │  PostToolUse Hook (test_checker.py)                   │   │
│  │  • 监控测试命令执行                                    │   │
│  │  • 识别测试结果                                        │   │
│  │  • 提供额外反馈                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Layer 3: 专门化的 Subagents                    │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌───────────┐   │
│  │ Planner  │  │ Developer │  │ Tester │  │ Debugger  │   │
│  │          │  │           │  │        │  │           │   │
│  │ 📋 分析  │  │ 💻 编码   │  │ 🧪 测试│  │ 🔍 调试   │   │
│  │ 需求     │  │ 实现      │  │ 验证   │  │ 分析      │   │
│  │ 规划     │  │ 功能      │  │ 功能   │  │ 问题      │   │
│  │          │  │           │  │        │  │           │   │
│  │ Tools:   │  │ Tools:    │  │ Tools: │  │ Tools:    │   │
│  │ Read     │  │ Read      │  │ Bash   │  │ Read      │   │
│  │ Grep     │  │ Write     │  │ Read   │  │ Grep      │   │
│  │ Glob     │  │ Edit      │  │ Grep   │  │ Glob      │   │
│  │ Bash     │  │ Grep      │  │ Glob   │  │ Bash      │   │
│  │          │  │ Glob      │  │        │  │           │   │
│  │          │  │ Bash      │  │        │  │           │   │
│  └──────────┘  └───────────┘  └────────┘  └───────────┘   │
│                                                              │
│  每个 Agent:                                                 │
│  • 独立的上下文窗口                                          │
│  • 专门的系统提示                                            │
│  • 受限的工具访问                                            │
│  • 可配置的模型选择                                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 执行流程详解

### 阶段 1: 启动

```
用户输入：/auto-dev 写一个贪吃蛇游戏
         ↓
auto-dev.md 命令被触发
         ↓
主 Claude 实例（DM）接收请求并开始协调
```

### 阶段 2: 规划

```
DM 调用 → Planner Agent
              ↓
         分析需求
         研究代码库
         制定详细计划
              ↓
         返回完整计划
              ↓
SubagentStop Hook 触发 → workflow_dm.py
              ↓
         检测到: agent_completed = 'planner'
         决策: "Use developer agent to implement"
              ↓
         返回 {"decision": "block", "reason": "..."}
              ↓
主实例被强制继续 → 进入阶段 3
```

### 阶段 3: 实现

```
DM 调用 → Developer Agent (传递完整计划)
              ↓
         读取现有代码
         按步骤实现
         创建/修改文件
              ↓
         返回实现报告
              ↓
SubagentStop Hook 触发 → workflow_dm.py
              ↓
         检测到: agent_completed = 'developer'
                debug_iterations = 0
         决策: "Use tester agent to verify"
              ↓
         返回 {"decision": "block", "reason": "..."}
              ↓
主实例被强制继续 → 进入阶段 4
```

### 阶段 4: 测试

```
DM 调用 → Tester Agent
              ↓
         查找测试命令
         运行自动化测试
         执行手动测试
              ↓
         分析结果 → 判断通过/失败
              ↓
         返回测试报告 (包含状态标记)
              ↓
PostToolUse Hook 触发 → test_checker.py (如果有 Bash 命令)
         监控测试执行
              ↓
SubagentStop Hook 触发 → workflow_dm.py
              ↓
         检测到: agent_completed = 'tester'
                test_status = 'passed' 或 'failed'
              ↓
    ┌────────┴────────┐
    ↓                 ↓
  PASSED            FAILED
    ↓                 ↓
  完成          进入 Debug Loop
```

### 阶段 5: Debug Loop（仅在测试失败时）

```
                Debug Loop (最多 5 次迭代)
                ┌─────────────────────────┐
                │                         │
                ↓                         │
DM 调用 → Debugger Agent                  │
              ↓                           │
         分析测试失败报告                   │
         定位问题根源                       │
         提供修复建议                       │
              ↓                           │
         返回调试分析                       │
              ↓                           │
SubagentStop Hook → workflow_dm.py        │
         决策: "Use developer to fix"     │
              ↓                           │
DM 调用 → Developer Agent (传递调试分析)   │
              ↓                           │
         实现修复                           │
              ↓                           │
SubagentStop Hook → workflow_dm.py        │
         决策: "Use tester to re-test"    │
              ↓                           │
DM 调用 → Tester Agent                    │
              ↓                           │
         重新运行测试                       │
              ↓                           │
    ┌────────┴────────┐                  │
    ↓                 ↓                  │
  PASSED            FAILED               │
    ↓                 ↓                  │
  完成        iteration < 5? ────────────┘
                     ↓
              iteration >= 5
                     ↓
         报告: 达到最大迭代次数，需要人工干预
                     ↓
                   完成
```

### 阶段 6: 完成

```
DM 生成最终报告
    ↓
包含：
• 实施的功能
• 创建/修改的文件
• 测试结果
• 解决的问题
• 最终状态 (成功/部分成功/需要人工)
```

## 🧠 Hook 决策逻辑详解

### workflow_dm.py 决策表

| 输入状态 | 输出决策 |
|---------|---------|
| **Agent**: planner<br>**Test**: N/A<br>**Iterations**: N/A | **Block**: ✅<br>**Next**: "Use developer agent to implement the plan" |
| **Agent**: developer<br>**Test**: N/A<br>**Iterations**: 0 | **Block**: ✅<br>**Next**: "Use tester agent to verify" |
| **Agent**: developer<br>**Test**: N/A<br>**Iterations**: >0 | **Block**: ✅<br>**Next**: "Use tester agent to re-test (Iteration N)" |
| **Agent**: tester<br>**Test**: PASSED<br>**Iterations**: any | **Block**: ❌<br>**Next**: Natural completion |
| **Agent**: tester<br>**Test**: FAILED<br>**Iterations**: <5 | **Block**: ✅<br>**Next**: "Use debugger agent to analyze failures" |
| **Agent**: tester<br>**Test**: FAILED<br>**Iterations**: ≥5 | **Block**: ❌<br>**Next**: Natural completion (max iterations reached) |
| **Agent**: debugger<br>**Test**: N/A<br>**Iterations**: any | **Block**: ✅<br>**Next**: "Use developer agent to implement fixes" |

### 状态检测方法

**Agent 类型检测:**
```python
# 1. 查找 subagent_type 参数
if '"planner"' in transcript:
    return 'planner'

# 2. 查找角色特定的输出模式
if 'implementation plan:' in transcript:
    return 'planner'
if 'implementation complete' in transcript:
    return 'developer'
if 'test results:' in transcript:
    return 'tester'
```

**测试状态检测:**
```python
# 查找明确的状态标记
if 'test results: passed' in transcript:
    return 'passed'
if 'test results: failed' in transcript:
    return 'failed'

# 查找符号标记
if re.search(r'passed:?\s*✅', transcript) and 'failed: 0' in transcript:
    return 'passed'
```

**迭代计数:**
```python
# 统计 debugger 使用次数
debugger_uses = len(re.findall(r'use the debugger', transcript))
return debugger_uses
```

## 🔌 组件交互图

```
┌────────────────────────────────────────────────────┐
│                   用户交互                          │
└────────────────────────────────────────────────────┘
                      ↓
              /auto-dev [需求]
                      ↓
┌────────────────────────────────────────────────────┐
│           auto-dev.md (Slash Command)              │
│  • 定义完整工作流程                                  │
│  • 提供详细指令给 DM                                 │
│  • 指定各阶段的 agent 调用                           │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│          主 Claude 实例 (DM 角色)                   │
│                                                     │
│  协调循环:                                          │
│  1. 理解当前阶段                                     │
│  2. 选择合适的 agent                                │
│  3. 准备完整上下文                                   │
│  4. 调用 Task 工具                                  │
│  5. 等待 agent 完成                                 │
│  6. 接收结果                                        │
│  7. (Hook 介入决定下一步)                           │
│  8. 循环...                                        │
└────────────────────────────────────────────────────┘
         ↓                                  ↑
         ↓                                  ↑
    Task Tool                         Hook Decision
         ↓                                  ↑
         ↓                                  ↑
┌────────┴───────────────────────────────────┴───────┐
│                  Subagent 隔离层                     │
│                                                     │
│  每个 Subagent:                                     │
│  • 接收特定任务和上下文                              │
│  • 在独立上下文窗口中工作                            │
│  • 使用受限的工具集                                  │
│  • 返回结构化结果                                    │
│  • 触发 SubagentStop 事件                           │
└─────────────────────────────────────────────────────┘
                      ↓
         SubagentStop Event 触发
                      ↓
┌─────────────────────────────────────────────────────┐
│           workflow_dm.py (Hook Script)              │
│                                                     │
│  执行流程:                                           │
│  1. 读取 hook 输入 (JSON from stdin)                │
│  2. 读取 transcript 文件                            │
│  3. 检测 agent 类型                                 │
│  4. 检测测试状态                                     │
│  5. 统计迭代次数                                     │
│  6. 应用决策逻辑                                     │
│  7. 返回决策 (block/continue)                       │
└─────────────────────────────────────────────────────┘
                      ↓
           {"decision": "block", "reason": "..."}
                      ↓
        强制主实例继续工作 → 回到 DM 协调循环
```

## 📦 数据流

### 1. 用户请求 → DM

```json
{
  "command": "/auto-dev",
  "arguments": "写一个贪吃蛇游戏"
}
```

### 2. DM → Planner Agent

```
Task Tool 调用:
{
  "subagent_type": "general-purpose",
  "description": "Planning phase",
  "prompt": "Analyze the following feature request and create a detailed implementation plan: 写一个贪吃蛇游戏..."
}
```

### 3. Planner → DM (结果)

```markdown
# Implementation Plan: 贪吃蛇游戏

## 1. Requirements Summary
- 游戏网格和蛇的显示
- 键盘控制
- 食物生成和得分
...

## 2. Codebase Analysis
...

## 3. Technical Approach
...
```

### 4. Hook 接收的数据

```json
{
  "event": "SubagentStop",
  "tool_name": "Task",
  "subagent_type": "general-purpose",
  "transcript_path": "/path/to/transcript.txt",
  "tool_result": "..."
}
```

### 5. Hook 返回的决策

```json
{
  "decision": "block",
  "reason": "Use the **developer** agent to implement the plan created by the planner. Pass the complete implementation plan to the developer."
}
```

### 6. DM → Developer Agent

```
Task Tool 调用:
{
  "subagent_type": "general-purpose",
  "description": "Development phase",
  "prompt": "Implement the following plan: [完整的 Planner 输出]..."
}
```

...循环继续...

## 🎛️ 配置流程

### settings.json 配置

```json
{
  "hooks": {
    "SubagentStop": [                    ← 事件类型
      {
        "description": "...",            ← 可读描述
        "hooks": [                       ← Hook 列表
          {
            "type": "command",           ← Hook 类型
            "command": "python ...",     ← 执行的命令
            "timeout": 5000              ← 超时（毫秒）
          }
        ]
      }
    ]
  }
}
```

### Agent 配置结构

```markdown
---
name: agent-name              ← Agent 标识符
description: Brief desc       ← 何时使用这个 agent
tools: Tool1, Tool2          ← 允许的工具列表
model: sonnet|opus|haiku     ← 使用的模型
---

System prompt content...     ← Agent 的系统提示
详细说明角色、职责、流程等
```

## 🚦 错误处理和边界情况

### 1. Agent 失败

```
如果 Agent 无法完成任务:
  ↓
DM 识别失败
  ↓
根据失败类型:
  • 如果是 planner: 使用假设继续
  • 如果是 developer: 记录问题，继续测试
  • 如果是 tester: 使用手动测试
  • 如果是 debugger: 尝试通用修复
```

### 2. Hook 失败

```
如果 Hook 脚本出错:
  ↓
错误被捕获并记录到 stderr
  ↓
Hook 返回 exit(0) (不干预)
  ↓
工作流自然继续（DM 自主决策）
```

### 3. 最大迭代次数

```
Debug Loop 达到 5 次:
  ↓
workflow_dm.py 检测到 iterations >= 5
  ↓
返回 decision: "continue" (不 block)
  ↓
DM 生成最终报告（部分成功）
  ↓
建议人工介入
```

### 4. 测试不存在

```
Tester 无法找到测试:
  ↓
执行手动测试场景
  ↓
报告状态: "NO_TESTS"
  ↓
workflow_dm.py 根据手动测试结果决定
  ↓
如果手动测试通过: 完成
如果手动测试失败: 进入 debug loop
```

## 🔬 可扩展性

### 添加新的 Agent

1. **创建 Agent 配置**: `.claude/agents/my-agent.md`
2. **定义角色和工具**: 在 frontmatter 中配置
3. **编写系统提示**: 详细说明职责
4. **更新 workflow_dm.py**: 添加新的决策分支
5. **更新 auto-dev.md**: 在工作流中调用新 agent

### 添加新的 Hook

1. **创建 Hook 脚本**: `.claude/hooks/my-hook.py`
2. **实现逻辑**: 读取 stdin, 分析, 返回决策
3. **配置触发**: 在 settings.json 中添加
4. **测试**: 使用 echo 模拟输入进行测试

### 创建新的工作流

1. **创建 Command**: `.claude/commands/my-workflow.md`
2. **定义阶段**: 规划 agent 调用顺序
3. **添加 Hook 支持**: 确保 hooks 能识别新工作流
4. **测试和迭代**: 逐步优化流程

## 📈 性能优化

### Token 优化

1. **上下文隔离**: 每个 agent 独立上下文
2. **精确工具权限**: 只给必要的工具
3. **模型选择**: 简单任务用 haiku
4. **提示优化**: 精简但明确的指令

### 速度优化

1. **并行化**: 未来可支持并行 agent 调用
2. **缓存**: 重复任务可以缓存计划
3. **快速失败**: 早期检测并报告问题
4. **增量实现**: 分步实现而非一次全部

## 🎯 设计原则

1. **关注点分离**: 每个组件有单一职责
2. **声明式配置**: 通过 markdown 和 JSON 配置
3. **可观察性**: 充分的日志和状态报告
4. **优雅降级**: 失败时有合理的回退
5. **人机协作**: 支持人工介入和手动控制

---

这个架构设计实现了高度自动化的同时保持了灵活性和可控性。
