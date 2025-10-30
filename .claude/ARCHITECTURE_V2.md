# 系统架构详解 V2.0

**版本**: 2.0 - TDD + TODOS 驱动 + MCP 集成
**更新日期**: 2025-10-31

## 🎯 架构改进概览

本版本架构在 V1.0 基础上进行了重大改进：

### 核心改进

1. **文档驱动工作流**: 使用 `.claude/workflow/` 下的 4 个文档驱动整个流程
2. **TDD 强制实施**: Developer 严格遵循 Test-Driven Development 方法论
3. **TODOS 状态追踪**: Hook 读取 TODOS.md 而非 transcript，减少上下文消耗
4. **MCP 工具集成**: Tester 使用浏览器自动化工具进行功能测试
5. **上下文优化**: 传递文档引用而非完整内容，大幅降低 token 使用

## 🏗️ 三层架构设计

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
│         Layer 2: Claude Code 主实例 + Hooks + Docs           │
│                   （DM - Development Manager）               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  主 Claude 实例                                        │   │
│  │  - 理解用户需求                                        │   │
│  │  - 协调子代理                                          │   │
│  │  - 传递文档引用（非完整内容）                            │   │
│  │  - 监控 TODOS.md 状态                                  │   │
│  │  - 做出高层决策                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Workflow Documents (.claude/workflow/)               │   │
│  │                                                        │   │
│  │  • REQUIREMENTS.md - 需求文档                          │   │
│  │  • IMPLEMENTATION.md - TDD实施计划                     │   │
│  │  • TEST_PLAN.md - 功能测试计划（含MCP命令）             │   │
│  │  • TODOS.md - 工作流状态追踪（核心）                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Hooks (自动化控制层)                                  │   │
│  │                                                        │   │
│  │  SubagentStop Hook (workflow_dm.py) - V2              │   │
│  │  • 读取 TODOS.md 获取工作流状态                         │   │
│  │  • 检测哪个代理完成                                     │   │
│  │  • 基于 Phase 状态决定下一步                            │   │
│  │  • 通过 "block" 机制强制继续                            │   │
│  │  • 优先使用 TODOS，后备 transcript 解析                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Layer 3: 专门化的 Subagents                    │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌───────────┐   │
│  │ Planner  │  │ Developer │  │ Tester │  │ Debugger  │   │
│  │          │  │           │  │        │  │           │   │
│  │ 📋 分析  │  │ 💻 TDD    │  │ 🧪 MCP │  │ 🔍 调试   │   │
│  │ 需求     │  │ 开发      │  │ 功能   │  │ 分析      │   │
│  │ 创建文档  │  │ 测试先行  │  │ 测试   │  │ 问题      │   │
│  │          │  │           │  │        │  │           │   │
│  │ 输出:    │  │ 流程:     │  │ 使用:  │  │ Tools:    │   │
│  │ 4个MD    │  │ RED       │  │ Chrome │  │ Read      │   │
│  │ 文档     │  │ GREEN     │  │ DevTools│ │ Grep      │   │
│  │          │  │ REFACTOR  │  │ MCP    │  │ Glob      │   │
│  │ Tools:   │  │           │  │ Playwright│ │ Bash      │   │
│  │ Read     │  │ Tools:    │  │ MCP    │  │           │   │
│  │ Write    │  │ Read      │  │        │  │           │   │
│  │ Grep     │  │ Write     │  │ Tools: │  │           │   │
│  │ Glob     │  │ Edit      │  │ Bash   │  │           │   │
│  │ Bash     │  │ Bash      │  │ Read   │  │           │   │
│  │          │  │           │  │ Edit   │  │           │   │
│  └──────────┘  └───────────┘  └────────┘  └───────────┘   │
│                                                              │
│  每个 Agent:                                                 │
│  • 读取 .claude/workflow/ 下的相关文档                        │
│  • 独立的上下文窗口                                          │
│  • 专门的系统提示                                            │
│  • 受限的工具访问                                            │
│  • 更新 TODOS.md 记录进度                                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 执行流程详解（V2.0）

### 阶段 1: 规划（Planning）

```
用户输入：/auto-dev 实现用户登录功能
         ↓
auto-dev.md 命令被触发
         ↓
DM 调用 → Planner Agent
              ↓
         ┌─────────────────────────────────┐
         │ Planner 执行流程：               │
         │ 1. 分析需求                      │
         │ 2. 研究代码库                    │
         │ 3. 创建 4 个文档：               │
         │    - REQUIREMENTS.md            │
         │    - IMPLEMENTATION.md (TDD)    │
         │    - TEST_PLAN.md (MCP测试)     │
         │    - TODOS.md (状态追踪)        │
         └─────────────────────────────────┘
              ↓
SubagentStop Hook 触发 → workflow_dm.py
              ↓
         读取 .claude/workflow/TODOS.md
              ↓
         检测到: Phase 1 完成 ✅
         决策: "Read TODOS.md, then use Developer for Phase 2"
              ↓
         返回 {"decision": "block", "reason": "..."}
              ↓
主实例被强制继续 → 进入阶段 2
```

#### Planner 输出的文档结构

**.claude/workflow/REQUIREMENTS.md**
```markdown
# Requirements Document
**Feature**: 用户登录功能

## Functional Requirements
- FR-1: 用户可以通过邮箱和密码登录
  - Acceptance: 输入正确凭证后跳转到仪表板
- FR-2: 登录失败显示错误信息
  - Acceptance: 输入错误凭证显示"用户名或密码错误"
...
```

**.claude/workflow/IMPLEMENTATION.md**
```markdown
# Implementation Plan

## TDD Implementation Steps

### Step 1: 用户认证逻辑
**TDD Cycle**:
1. Write Tests (RED):
   - 测试文件: tests/auth.test.js
   - 测试: 正确凭证返回成功，错误凭证返回失败
2. Run Tests (RED): 应该失败
3. Implement (GREEN): src/auth.js 实现验证逻辑
4. Run Tests (GREEN): 应该通过
5. Refactor: 优化代码结构
...
```

**.claude/workflow/TEST_PLAN.md**
```markdown
# Test Plan

## Functional Test Cases

### TC-F01: 成功登录场景
**MCP Commands**:
```javascript
await chrome.navigate('http://localhost:3000/login');
await chrome.type('#email', 'user@example.com');
await chrome.type('#password', 'password123');
await chrome.click('#login-button');
await chrome.waitForSelector('#dashboard');
await chrome.screenshot('login-success.png');
```
...
```

**.claude/workflow/TODOS.md**
```markdown
# Workflow Todos

**Status**: Planning
**Current Phase**: Phase 1 - Planning

## Documentation Index
- REQUIREMENTS.md - 需求文档
- IMPLEMENTATION.md - TDD实施计划
- TEST_PLAN.md - 功能测试计划
- TODOS.md - 本文件

## Phase 1: Planning ✅ COMPLETED
- [x] Create all documents
...

## Phase 2: Development (TDD) ⏳ PENDING
### Step 1: 用户认证逻辑
- [ ] Write unit tests (RED)
- [ ] Run tests - should FAIL
- [ ] Implement code (GREEN)
- [ ] Run tests - should PASS
- [ ] Refactor
...
```

### 阶段 2: 开发（TDD Development）

```
DM 读取 TODOS.md → 知道当前在 Phase 2
DM 调用 → Developer Agent
         传递: "Read TODOS.md and IMPLEMENTATION.md"
              ↓
         ┌─────────────────────────────────┐
         │ Developer TDD 流程（Step 1）：   │
         │                                 │
         │ 1. RED: 写测试                   │
         │    - 创建 tests/auth.test.js    │
         │    - 写失败的测试                │
         │    - 运行: npm test → ❌ FAIL   │
         │    - 更新 TODOS.md ✅           │
         │                                 │
         │ 2. GREEN: 实现功能               │
         │    - 创建 src/auth.js           │
         │    - 写最小实现                  │
         │    - 运行: npm test → ✅ PASS   │
         │    - 更新 TODOS.md ✅           │
         │                                 │
         │ 3. REFACTOR: 重构                │
         │    - 优化代码                    │
         │    - 运行: npm test → ✅ PASS   │
         │    - 更新 TODOS.md ✅           │
         │                                 │
         │ 重复 Step 2, Step 3...          │
         └─────────────────────────────────┘
              ↓
         更新 TODOS.md:
         Phase 2: Development ✅ COMPLETED
              ↓
SubagentStop Hook 触发
              ↓
         读取 TODOS.md
              ↓
         检测到: Phase 2 完成 ✅
         决策: "Read TODOS.md and TEST_PLAN.md, use Tester for Phase 3"
              ↓
主实例被强制继续 → 进入阶段 3
```

#### TDD 流程详解

```
Step 1: 用户认证逻辑
┌─────────────────────────────────────┐
│ RED 阶段                             │
│ Developer 写测试:                    │
│   tests/auth.test.js                │
│   describe('authenticate', () => {  │
│     it('should return true for     │
│         valid credentials', ...)    │
│   });                               │
│                                     │
│ 运行测试: npm test                   │
│ 结果: ❌ FAIL (函数不存在)            │
│                                     │
│ 更新 TODOS.md:                      │
│ - [x] Write unit tests (RED)        │
│ - [x] Run tests - should FAIL       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ GREEN 阶段                           │
│ Developer 实现最小代码:               │
│   src/auth.js                       │
│   function authenticate(email, pwd) │
│     // 最小实现使测试通过             │
│     return checkCredentials(...)    │
│   }                                 │
│                                     │
│ 运行测试: npm test                   │
│ 结果: ✅ PASS                        │
│                                     │
│ 更新 TODOS.md:                      │
│ - [x] Implement code (GREEN)        │
│ - [x] Run tests - should PASS       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ REFACTOR 阶段                        │
│ Developer 重构代码:                  │
│ - 提取重复逻辑                       │
│ - 改进变量命名                       │
│ - 添加注释                           │
│                                     │
│ 运行测试: npm test                   │
│ 结果: ✅ PASS (仍然通过)              │
│                                     │
│ 更新 TODOS.md:                      │
│ - [x] Refactor code                 │
│ - [x] Step 1 complete ✅            │
└─────────────────────────────────────┘
```

### 阶段 3: 功能测试（Functional Testing with MCP）

```
DM 读取 TODOS.md → 知道 Phase 2 完成，开始 Phase 3
DM 调用 → Tester Agent
         传递: "Read TODOS.md and TEST_PLAN.md"
              ↓
         ┌─────────────────────────────────┐
         │ Tester MCP 测试流程：            │
         │                                 │
         │ 1. 准备环境                      │
         │    - 启动 dev server             │
         │    - 准备测试数据                │
         │                                 │
         │ 2. 执行 TC-F01（成功登录）        │
         │    使用 Chrome DevTools MCP:     │
         │    - chrome.navigate(url)       │
         │    - chrome.type('#email', ...) │
         │    - chrome.click('#login')     │
         │    - chrome.screenshot(...)     │
         │    - 验证: 成功跳转到仪表板        │
         │    结果: ✅ PASS                 │
         │    更新 TODOS.md ✅             │
         │                                 │
         │ 3. 执行 TC-F02（失败登录）        │
         │    - 输入错误凭证                │
         │    - 验证: 显示错误信息           │
         │    结果: ✅ PASS                 │
         │    更新 TODOS.md ✅             │
         │                                 │
         │ 4. 执行所有测试用例...           │
         │                                 │
         │ 最终状态: 所有测试 PASSED ✅      │
         └─────────────────────────────────┘
              ↓
         更新 TODOS.md:
         Phase 3: Functional Testing ✅ COMPLETED
         Phase 3 Status: PASSED ✅
              ↓
SubagentStop Hook 触发
              ↓
         读取 TODOS.md
              ↓
         检测到: Phase 3 完成且状态 = PASSED
         决策: 不 block（允许完成）
              ↓
工作流自然完成 → 进入阶段 5（完成）
```

#### MCP 工具使用示例

**TC-F01: 成功登录测试**
```javascript
// Tester 执行的 MCP 命令

// 1. 导航到登录页
await chrome.navigate('http://localhost:3000/login');

// 2. 输入凭证
await chrome.type('#email-input', 'user@example.com');
await chrome.type('#password-input', 'password123');

// 3. 截图（测试前状态）
await chrome.screenshot('screenshots/tc-f01-before-login.png');

// 4. 点击登录按钮
await chrome.click('#login-button');

// 5. 等待跳转
await chrome.waitForSelector('#dashboard', { timeout: 5000 });

// 6. 验证 URL
const currentUrl = await chrome.getUrl();
assert(currentUrl.includes('/dashboard'));

// 7. 验证用户信息显示
const userName = await chrome.getText('#user-name');
assert(userName === 'User Name');

// 8. 截图（测试后状态）
await chrome.screenshot('screenshots/tc-f01-after-login.png');

// 9. 检查控制台错误
const consoleLogs = await chrome.getConsoleLogs();
const errors = consoleLogs.filter(log => log.level === 'error');
assert(errors.length === 0, 'No console errors expected');

// 测试结果: ✅ PASS
```

### 阶段 4: Debug Loop（仅在测试失败时）

```
假设 TC-F02 失败...

SubagentStop Hook 检测到: Phase 3 FAILED ❌
              ↓
         读取 TODOS.md
         - Phase 3 status: FAILED
         - Debug iteration: 0
              ↓
         决策: "Use Debugger to analyze (Iteration 1/5)"
              ↓
         ┌─────────────────────────────────┐
         │ Debugger 分析：                  │
         │ - 读取 TODOS.md Phase 4          │
         │ - 读取 tester 失败报告            │
         │ - 分析: 错误信息未正确显示         │
         │ - 根因: src/login.js:42          │
         │   错误处理逻辑缺失                │
         │ - 建议: 添加错误状态处理           │
         │                                 │
         │ 更新 TODOS.md Phase 4:           │
         │ - 添加调试分析                   │
         │ - Iteration: 1/5                │
         └─────────────────────────────────┘
              ↓
Hook: "Use Developer to fix"
              ↓
         ┌─────────────────────────────────┐
         │ Developer 修复（TDD）：          │
         │ 1. 更新/添加测试                 │
         │ 2. 实现修复                      │
         │ 3. 运行单元测试: ✅ PASS          │
         │ 4. 更新 TODOS.md                │
         └─────────────────────────────────┘
              ↓
Hook: "Use Tester to re-test (Iteration 1)"
              ↓
         ┌─────────────────────────────────┐
         │ Tester 重新测试：                │
         │ - 重跑 TC-F02                    │
         │ - 验证修复: ✅ PASS               │
         │ - 所有测试: ✅ PASS               │
         │                                 │
         │ 更新 TODOS.md:                  │
         │ Phase 3: PASSED ✅               │
         └─────────────────────────────────┘
              ↓
Hook 检测到: 所有测试通过
决策: 不 block
              ↓
工作流完成
```

### 阶段 5: 完成（Completion）

```
DM 生成最终报告:

# Autonomous Development Workflow Complete

## Phase 1: Planning ✅
- REQUIREMENTS.md: 3 功能需求, 2 用户场景
- IMPLEMENTATION.md: 4 TDD 步骤
- TEST_PLAN.md: 5 功能测试用例
- TODOS.md: 工作流追踪器

## Phase 2: Development (TDD) ✅
- TDD Steps: 4 完成
- Unit Tests: 12 测试用例，全部 ✅ PASSING
- Files Created: src/auth.js, tests/auth.test.js, ...
- Files Modified: src/app.js:15-20, ...

## Phase 3: Functional Testing ✅
- Test Method: Chrome DevTools MCP
- Functional Tests: 5/5 PASSED
- Screenshots: 10 张测试截图保存
- Status: ✅ PASSED

## Phase 4: Debug Loop
- Iterations: 1/5
- Fixed: TC-F02 错误消息显示问题

## Final Status: ✅ SUCCESS
- Unit tests: ✅ All passing
- Functional tests: ✅ All passing
- Documentation: ✅ Complete
- Ready for deployment
```

## 📋 TODOS.md 驱动机制

### TODOS.md 的核心作用

1. **工作流状态的单一真实来源**
2. **减少上下文传递**（不需要在 DM 和 Agent 间传递大量内容）
3. **持久化追踪**（可随时查看进度）
4. **Hook 决策依据**（Hook 读取它来决定下一步）

### TODOS.md 更新流程

```
Planner 完成
    ↓
Planner 创建 TODOS.md
Phase 1: Planning ✅ COMPLETED
    ↓
Developer 开始
    ↓
Developer 完成每个 TDD 子步骤时更新:
- [x] Write unit tests (RED)
- [x] Run tests - should FAIL
- [x] Implement code (GREEN)
- [x] Run tests - should PASS
- [x] Refactor
    ↓
Developer 完成所有步骤
Phase 2: Development ✅ COMPLETED
    ↓
Tester 开始
    ↓
Tester 完成每个测试用例时更新:
- [x] TC-F01: 成功登录 - PASS
- [x] TC-F02: 失败登录 - PASS
...
    ↓
Tester 完成所有测试
Phase 3: Functional Testing ✅ COMPLETED
Phase 3 Status: PASSED ✅
    ↓
Hook 读取 TODOS.md
检测到: Phase 3 完成且 PASSED
决策: 允许完成（不 block）
```

### Hook 如何读取 TODOS.md

```python
# workflow_dm.py

def read_todos_file():
    """读取 TODOS.md"""
    todos_path = Path('.claude/workflow/TODOS.md')
    with open(todos_path, 'r') as f:
        return f.read().lower()

def parse_todos_status(todos_content):
    """解析 TODOS.md 状态"""
    status = {
        'current_phase': None,
        'phase1_complete': False,
        'phase2_complete': False,
        'phase3_complete': False,
        'phase3_status': None,  # 'passed' or 'failed'
        'debug_iteration': 0
    }

    # 检测 Phase 完成状态
    if 'phase 1: planning ✅ completed' in todos_content:
        status['phase1_complete'] = True

    if 'phase 2: development (tdd) ✅ completed' in todos_content:
        status['phase2_complete'] = True

    if 'phase 3: functional testing ✅ completed' in todos_content:
        status['phase3_complete'] = True
        status['phase3_status'] = 'passed'
    elif 'phase 3: functional testing ❌ failed' in todos_content:
        status['phase3_complete'] = True
        status['phase3_status'] = 'failed'

    # 统计 debug 迭代次数
    match = re.search(r'iteration:\s*(\d+)/5', todos_content)
    if match:
        status['debug_iteration'] = int(match.group(1))

    return status

def should_continue_workflow_v2(todos_status, agent_completed):
    """基于 TODOS.md 决策"""

    # Phase 1 完成 → 启动 Developer
    if todos_status['phase1_complete'] and not todos_status['phase2_complete']:
        if agent_completed == 'planner':
            return (True, "Read TODOS.md and IMPLEMENTATION.md, use Developer for Phase 2")

    # Phase 2 完成 → 启动 Tester
    if todos_status['phase2_complete'] and not todos_status['phase3_complete']:
        if agent_completed == 'developer':
            return (True, "Read TODOS.md and TEST_PLAN.md, use Tester for Phase 3")

    # Phase 3 完成且通过 → 完成工作流
    if todos_status['phase3_complete']:
        if todos_status['phase3_status'] == 'passed':
            return (False, None)  # 允许完成

        # Phase 3 失败 → 进入 Debug Loop
        if todos_status['phase3_status'] == 'failed':
            iteration = todos_status['debug_iteration']
            if iteration >= 5:
                return (False, None)  # 达到最大迭代
            return (True, f"Use Debugger to analyze (Iteration {iteration+1}/5)")

    # Debug loop: Debugger → Developer → Tester
    if agent_completed == 'debugger':
        return (True, "Use Developer to implement fixes")

    if agent_completed == 'developer' and todos_status['debug_iteration'] > 0:
        return (True, "Use Tester to re-test")

    return (False, None)
```

## 🎯 上下文优化策略

### V1.0 方式（高上下文消耗）

```
DM → Developer:
"Implement the following plan:

# Implementation Plan
[粘贴完整的 5000 token 计划内容...]

Follow these guidelines:
[更多指令...]
"

问题:
- DM 需要读取并传递完整计划
- Developer 接收大量可能不全用的内容
- 每次 agent 调用都重复传递
- Token 消耗巨大
```

### V2.0 方式（低上下文消耗）

```
DM → Developer:
"Read `.claude/workflow/TODOS.md` to see current status and Phase 2 tasks.
Read `.claude/workflow/IMPLEMENTATION.md` for detailed TDD steps.

Start Phase 2 (Development) following TDD methodology."

优点:
- DM 只传递文档路径（几十 token）
- Developer 自己读取需要的文档
- 文档在磁盘上，不占 context
- 可重复读取，不增加成本
- TODOS.md 作为导航中心
```

### 上下文节省估算

```
典型功能开发:

V1.0 上下文使用:
- Planning phase: 2000 tokens (传递需求)
- Development phase: 7000 tokens (传递计划)
- Testing phase: 8000 tokens (传递计划+代码)
- Debug iterations: 5000 tokens x N
Total: ~20,000+ tokens

V2.0 上下文使用:
- Planning phase: 500 tokens (创建文档)
- Development phase: 300 tokens (文档引用)
- Testing phase: 300 tokens (文档引用)
- Debug iterations: 300 tokens x N
Total: ~2,000 tokens

节省: 90% 上下文消耗
```

## 📊 数据流

### 1. 用户请求 → DM

```json
{
  "command": "/auto-dev",
  "arguments": "实现用户登录功能"
}
```

### 2. DM → Planner Agent

```
Task Tool 调用:
{
  "subagent_type": "planner",
  "description": "Planning phase",
  "prompt": "Analyze feature request and create 4 documents in .claude/workflow/:
            REQUIREMENTS.md, IMPLEMENTATION.md, TEST_PLAN.md, TODOS.md..."
}
```

### 3. Planner → 4 个文档

**输出文件**:
- `.claude/workflow/REQUIREMENTS.md`
- `.claude/workflow/IMPLEMENTATION.md`
- `.claude/workflow/TEST_PLAN.md`
- `.claude/workflow/TODOS.md`

### 4. Hook 接收的数据（SubagentStop）

```json
{
  "event": "SubagentStop",
  "tool_name": "Task",
  "subagent_type": "planner",
  "transcript_path": "/path/to/transcript.txt",
  "tool_result": "..."
}
```

### 5. Hook 读取 TODOS.md

```python
# Hook 执行
todos_content = read_todos_file()
# 读取 .claude/workflow/TODOS.md

todos_status = parse_todos_status(todos_content)
# {
#   'phase1_complete': True,
#   'phase2_complete': False,
#   'phase3_complete': False,
#   ...
# }
```

### 6. Hook 返回决策

```json
{
  "decision": "block",
  "reason": "Read `.claude/workflow/TODOS.md` to see current status, then read `.claude/workflow/IMPLEMENTATION.md`. Use the developer agent for Phase 2."
}
```

### 7. DM → Developer Agent

```
Task Tool 调用:
{
  "subagent_type": "developer",
  "description": "Development phase",
  "prompt": "Read .claude/workflow/TODOS.md for status, read .claude/workflow/IMPLEMENTATION.md for TDD steps.
            Start Phase 2 following TDD: write tests first, then implement..."
}
```

### 8. Developer → 代码 + 更新 TODOS.md

**创建文件**:
- `src/auth.js`
- `tests/auth.test.js`

**修改文件**:
- `.claude/workflow/TODOS.md` (标记步骤完成)

## 🔍 关键改进点对比

| 方面 | V1.0 | V2.0 |
|------|------|------|
| **状态追踪** | Transcript 解析 | TODOS.md 文件 |
| **上下文传递** | 完整内容粘贴 | 文档路径引用 |
| **TDD** | 可选 | 强制执行 |
| **测试分离** | Tester 跑所有测试 | Unit(Dev) + Functional(Tester) |
| **功能测试** | 手动/命令行 | MCP 工具自动化 |
| **文档化** | 单一计划 | 4 个专业文档 |
| **Token 消耗** | 高 (~20K) | 低 (~2K, 节省 90%) |
| **可恢复性** | 依赖 transcript | 持久化 TODOS.md |
| **可读性** | Transcript 难读 | 结构化 Markdown |

## 🛠️ MCP 工具集成

### 可用的 MCP 工具

1. **Chrome DevTools MCP**
   - 浏览器自动化
   - DOM 交互
   - 截图
   - 控制台日志

2. **Playwright MCP**
   - 跨浏览器测试
   - 高级自动化
   - 网络监控

### MCP 测试示例

**TEST_PLAN.md 中的测试定义**:
```markdown
### TC-F01: 成功登录
**MCP Commands**:
```javascript
await chrome.navigate('http://localhost:3000/login');
await chrome.type('#email', 'user@example.com');
await chrome.type('#password', 'password123');
await chrome.click('#login-btn');
await chrome.waitForSelector('#dashboard');
```

**Expected**: 用户成功登录并跳转到仪表板
**Verification**:
- [ ] URL 包含 /dashboard
- [ ] 显示用户名
- [ ] 无控制台错误
```

**Tester 执行**:
```
Tester 读取 TEST_PLAN.md
→ 看到 TC-F01 的 MCP 命令
→ 执行这些 MCP 命令
→ 验证所有 verification points
→ 截图作为证据
→ 更新 TODOS.md 结果
```

## 🎛️ 配置文件结构

### settings.json 配置

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "description": "TODOS-driven workflow orchestration (V2)",
        "hooks": [
          {
            "type": "command",
            "command": "python .claude/hooks/workflow_dm.py",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### Agent 配置示例（Planner）

```markdown
---
name: planner
description: Creates comprehensive planning documentation
tools: Read, Grep, Glob, Bash, Write
model: sonnet
---

You MUST create FOUR files in `.claude/workflow/`:
1. REQUIREMENTS.md - What to build and why
2. IMPLEMENTATION.md - How to build (TDD steps)
3. TEST_PLAN.md - How to verify (MCP test scenarios)
4. TODOS.md - Workflow tracker

[详细模板...]
```

### Agent 配置示例（Developer）

```markdown
---
name: developer
description: TDD-based development
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

**Process:**
Step 0: Read TODOS.md and IMPLEMENTATION.md
Step 1: Write tests FIRST (RED)
Step 2: Run tests - expect FAIL
Step 3: Implement code (GREEN)
Step 4: Run tests - expect PASS
Step 5: Refactor
Step 6: Update TODOS.md

[详细指南...]
```

### Agent 配置示例（Tester）

```markdown
---
name: tester
description: Functional testing with MCP tools
tools: Bash, Read, Grep, Glob
model: sonnet
---

**Process:**
Step 0: Read TODOS.md and TEST_PLAN.md
Step 1: Setup environment
Step 2: Execute functional tests using MCP
Step 3: Verify all verification points
Step 4: Update TODOS.md with results

[MCP 工具使用指南...]
```

## 📈 性能和扩展性

### Token 优化

**V2.0 优化策略**:
1. **文档引用代替内容传递**: 节省 80-90% 上下文
2. **TODOS 驱动决策**: Hook 只读取小文件，不解析长 transcript
3. **Agent 按需读取**: 只读取需要的文档部分
4. **持久化状态**: 不需要重复传递历史信息

### 速度优化

1. **Hook 快速决策**: 读取结构化 TODOS.md 比解析 transcript 快 10x
2. **并行潜力**: 未来可支持并行 TDD 步骤（独立模块）
3. **缓存友好**: 文档可被多次读取无额外成本

### 可扩展性

**添加新 Agent**:
1. 创建 agent 配置 `.claude/agents/my-agent.md`
2. 定义 agent 如何读取/更新 TODOS.md
3. 更新 workflow_dm.py 决策逻辑
4. 更新 IMPLEMENTATION.md 模板包含新 agent 步骤

**添加新 MCP 工具**:
1. 在 TEST_PLAN.md 模板中添加新工具示例
2. 更新 tester agent 文档说明新工具用法
3. 提供测试场景示例

## 🔐 最佳实践

### 1. TODOS.md 管理

**Do ✅**:
- 每个 agent 完成子任务立即更新
- 使用明确的状态标记（✅ ❌ ⏳）
- 保持文档索引部分完整
- 包含 Next Action 指示

**Don't ❌**:
- 批量更新多个步骤
- 模糊的状态描述
- 删除已完成的部分（保留历史）
- 忘记更新 timestamp

### 2. TDD 实施

**Do ✅**:
- 严格遵循 RED-GREEN-REFACTOR
- 每个步骤运行测试
- 写有意义的测试名称
- 测试边界情况

**Don't ❌**:
- 跳过 RED 阶段直接实现
- 写通过率 100% 的"测试"
- 过度测试实现细节
- 忽略重构阶段

### 3. MCP 测试

**Do ✅**:
- 在 TEST_PLAN.md 提供完整 MCP 命令
- 截图关键步骤
- 验证所有 verification points
- 保存测试证据

**Don't ❌**:
- 只描述步骤不提供 MCP 代码
- 跳过截图
- 假设验证通过
- 忽略控制台错误

### 4. 文档维护

**Do ✅**:
- Planner 创建完整准确的文档
- 文档间相互引用保持一致
- 使用标准化格式
- 包含实际内容不留占位符

**Don't ❌**:
- 创建空文档或模板
- 文档间信息矛盾
- 使用非标准格式
- 遗漏关键部分

## 🚀 总结

V2.0 架构通过以下创新实现了更高效、更可靠的自动化开发工作流：

1. **📋 文档驱动**: 4 个专业文档（REQUIREMENTS, IMPLEMENTATION, TEST_PLAN, TODOS）
2. **🧪 TDD 强制**: Developer 严格遵循测试先行
3. **📊 TODOS 追踪**: Hook 读取结构化状态，不解析 transcript
4. **🌐 MCP 集成**: Tester 使用浏览器自动化工具
5. **💡 上下文优化**: 传递文档引用，节省 90% token

这个架构既保持了 V1.0 的自主性和完整性，又大幅提升了效率、可维护性和可扩展性。
