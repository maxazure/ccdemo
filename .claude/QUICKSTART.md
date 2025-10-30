# 快速入门指南

## 🚀 30 秒上手

1. **确保在项目根目录**
   ```bash
   cd /path/to/your/project
   ```

2. **启动 Claude Code**
   ```bash
   claude
   ```

3. **执行自动化命令**
   ```
   /auto-dev 写一个贪吃蛇游戏
   ```

4. **等待完成** ☕
   - 系统会自动规划、实现、测试、修复
   - 全程无需人工干预

## 📋 命令速查

### 主命令

```bash
/auto-dev [功能描述]
```

**示例：**

```bash
# 创建游戏
/auto-dev 创建一个井字棋游戏，使用 HTML/CSS/JavaScript

# 添加功能
/auto-dev 为 Express API 添加用户认证功能，使用 JWT

# 修复问题
/auto-dev 修复购物车计算错误，处理边界情况

# 实现算法
/auto-dev 实现一个二分查找算法，包含完整的单元测试
```

### 手动使用单个 Agent

如果你想手动控制，可以单独调用：

```bash
# 只做规划
Use the planner agent to analyze this feature: [描述]

# 只做开发
Use the developer agent to implement: [描述]

# 只做测试
Use the tester agent to test the recent changes

# 只做调试
Use the debugger agent to analyze these test failures: [错误信息]
```

## 🎯 工作流程

```
你输入命令
    ↓
Planner 分析需求（自动）
    ↓
Developer 编写代码（自动）
    ↓
Tester 运行测试（自动）
    ↓
如果失败：Debugger → Developer → Tester（循环，自动）
    ↓
完成报告
```

## ⚙️ 配置位置

```
.claude/
├── agents/           # 代理配置（可编辑）
├── commands/         # auto-dev 命令（可自定义）
├── hooks/            # 自动化脚本（可调整逻辑）
└── settings.json     # Hook 配置（可启用/禁用）
```

## 🔧 常用调整

### 更改最大调试次数

编辑 `.claude/hooks/workflow_dm.py`：

```python
MAX_DEBUG_ITERATIONS = 5  # 改为你想要的数字
```

### 临时禁用自动化

```bash
# 重命名配置
mv .claude/settings.json .claude/settings.json.disabled

# 使用完后恢复
mv .claude/settings.json.disabled .claude/settings.json
```

### 更改 Agent 的模型

编辑 `.claude/agents/developer.md`：

```markdown
---
model: opus  # 更高质量，更慢更贵
---
```

或者：

```markdown
---
model: haiku  # 更快更便宜，质量略低
---
```

## 💡 使用技巧

### ✅ 好的提示

**具体明确：**
```
/auto-dev 创建 REST API 端点 /api/products，支持 CRUD 操作，
使用 Express + MongoDB，包含输入验证
```

**指定技术栈：**
```
/auto-dev 使用 React Hooks + TypeScript 创建一个待办事项列表组件
```

**说明测试需求：**
```
/auto-dev 实现用户密码验证，包含单元测试和边界情况测试
```

### ❌ 不好的提示

**太模糊：**
```
/auto-dev 做个网站
```

**太复杂：**
```
/auto-dev 创建一个完整的电商平台，包含前端、后端、支付、库存等所有功能
```
（建议：拆分成多个任务）

**没有上下文：**
```
/auto-dev 添加功能
```
（什么功能？用什么技术？）

## 🐛 故障排除速查

| 问题 | 快速解决 |
|------|---------|
| Hook 不工作 | 检查 `python --version` 是否可用 |
| 工作流卡住 | 查看最后输出，手动执行下一步 |
| 测试循环不停 | 查看调试分析，可能需要人工干预 |
| Agent 输出不对 | 编辑 `.claude/agents/*.md` 改进提示 |

## 📊 预期时间和成本

### 简单任务（如井字棋游戏）
- **时间**: 2-4 分钟
- **Token**: 25K-35K
- **成本**: ~$0.75-$1.05（Sonnet）

### 中等任务（如用户认证功能）
- **时间**: 4-8 分钟
- **Token**: 35K-60K
- **成本**: ~$1.05-$1.80（Sonnet）

### 复杂任务（如完整的 CRUD API）
- **时间**: 8-15 分钟
- **Token**: 60K-100K
- **成本**: ~$1.80-$3.00（Sonnet）

*注：需要调试迭代会增加时间和成本*

## 🎓 进阶用法

### Headless 模式（无 UI）

```bash
# 完全自动化
claude -p "/auto-dev 添加搜索功能" --max-turns 50

# 查看输出
claude -p "/auto-dev 添加搜索功能" --output-format json
```

### 批量任务

```bash
# tasks.txt
添加用户注册功能
添加登录功能
添加密码重置功能

# 批量执行
while read task; do
  claude -p "/auto-dev $task" --max-turns 50
done < tasks.txt
```

## 📚 详细文档

查看 `.claude/README.md` 获取：
- 完整架构说明
- 详细配置选项
- 高级用法示例
- 贡献指南

## 🆘 需要帮助？

在 Claude Code 会话中直接问：
```
这个自动化系统是如何工作的？
我如何修改 [specific agent]？
为什么测试循环没有停止？
```

---

**现在就试试吧！** 🎉

```
/auto-dev 写一个简单的计算器应用
```
