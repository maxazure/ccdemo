#!/usr/bin/env python3
"""
Workflow DM (Development Manager) Hook

This hook runs after each subagent completes (SubagentStop event).
It reads the TODOS.md file to determine workflow state and decides the next action.

Purpose: Enable autonomous multi-agent workflows by automatically
deciding what should happen next based on TODOS.md status and agent completion.

Key Improvement: Uses TODOS.md as the source of truth instead of transcript parsing,
reducing context usage and improving reliability.
"""

import json
import sys
import re
from pathlib import Path


def read_todos_file():
    """Read the TODOS.md file to get workflow state."""
    todos_path = Path('.claude/workflow/TODOS.md')
    try:
        if not todos_path.exists():
            print(f"[Workflow DM] TODOS.md not found at {todos_path}", file=sys.stderr)
            return None

        with open(todos_path, 'r', encoding='utf-8') as f:
            content = f.read()
            return content.lower()
    except Exception as e:
        print(f"[Workflow DM] Error reading TODOS.md: {e}", file=sys.stderr)
        return None


def parse_todos_status(todos_content):
    """Parse TODOS.md to extract current workflow state."""
    if not todos_content:
        return None

    status = {
        'current_phase': None,
        'phase1_complete': False,
        'phase2_complete': False,
        'phase3_complete': False,
        'phase3_status': None,  # 'passed', 'failed', or None
        'debug_iteration': 0
    }

    # Detect current phase
    if '**status**: planning' in todos_content:
        status['current_phase'] = 'planning'
    elif '**status**: development' in todos_content or 'phase 2:' in todos_content:
        status['current_phase'] = 'development'
    elif '**status**: testing' in todos_content or 'phase 3:' in todos_content:
        status['current_phase'] = 'testing'
    elif '**status**: debugging' in todos_content or 'phase 4:' in todos_content:
        status['current_phase'] = 'debugging'
    elif '**status**: complete' in todos_content:
        status['current_phase'] = 'complete'

    # Check phase completion status
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

    # Count debug iterations (look for "iteration: N/5" pattern)
    iteration_match = re.search(r'iteration:\s*(\d+)/5', todos_content)
    if iteration_match:
        status['debug_iteration'] = int(iteration_match.group(1))

    return status


def read_recent_transcript(transcript_path, lines=200):
    """Read recent lines from the transcript."""
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Get last N lines
            all_lines = content.split('\n')
            recent = '\n'.join(all_lines[-lines:])
            return recent.lower()
    except Exception as e:
        print(f"Error reading transcript: {e}", file=sys.stderr)
        return ""


def detect_agent_type(transcript):
    """Detect which agent just completed based on transcript content."""
    # Look for agent invocation patterns
    if 'subagent_type' in transcript:
        if '"planner"' in transcript or 'use the planner' in transcript:
            return 'planner'
        if '"developer"' in transcript or 'use the developer' in transcript:
            return 'developer'
        if '"tester"' in transcript or 'use the tester' in transcript:
            return 'tester'
        if '"debugger"' in transcript or 'use the debugger' in transcript:
            return 'debugger'

    # Fallback: Look for role-specific outputs
    if 'implementation plan:' in transcript or '## requirements summary' in transcript:
        return 'planner'
    if 'implementation complete' in transcript or 'files created:' in transcript:
        return 'developer'
    if 'test results:' in transcript or 'tests passed' in transcript or 'tests failed' in transcript:
        return 'tester'
    if 'debugging analysis' in transcript or 'root cause:' in transcript:
        return 'debugger'

    return 'unknown'


def detect_test_status(transcript):
    """Detect if tests passed or failed."""
    # Look for definitive test result markers
    if 'test results: passed' in transcript or 'all tests passed' in transcript:
        return 'passed'
    if 'test results: failed' in transcript or 'tests failed' in transcript:
        return 'failed'
    if 'no tests found' in transcript or 'no automated tests' in transcript:
        return 'no_tests'

    # Look for test success indicators
    if re.search(r'passed:?\s*✅', transcript) and 'failed: 0' in transcript:
        return 'passed'

    # Look for test failure indicators
    if re.search(r'failed:?\s*❌', transcript) or re.search(r'failed:\s*[1-9]', transcript):
        return 'failed'

    return 'unknown'


def count_debug_iterations(transcript):
    """Count how many debug-fix-test cycles have occurred."""
    # Count occurrences of debugger usage
    debugger_uses = len(re.findall(r'use the debugger', transcript))
    return debugger_uses


def is_in_auto_dev_workflow(transcript):
    """Check if we're in an auto-dev workflow."""
    return '/auto-dev' in transcript or 'autonomous development workflow' in transcript


def should_continue_workflow_v2(todos_status, agent_completed):
    """
    NEW decision logic based on TODOS.md status.
    This version uses the TODOS.md file as the source of truth.

    Returns: (should_block, reason)
    """
    MAX_DEBUG_ITERATIONS = 5

    # If no TODOS.md exists, fall back to legacy logic
    if not todos_status:
        return (False, None)

    # Phase 1: Planning completed -> Start development
    if todos_status['phase1_complete'] and not todos_status['phase2_complete']:
        if agent_completed == 'planner':
            return (True,
                "Read `.claude/workflow/TODOS.md` to see the current status, then read `.claude/workflow/IMPLEMENTATION.md` for the implementation plan. "
                "Use the **developer** agent to start Phase 2 (Development). "
                "Developer should follow TDD methodology: write tests first, then implement each step.")

    # Phase 2: Development completed -> Start functional testing
    if todos_status['phase2_complete'] and not todos_status['phase3_complete']:
        if agent_completed == 'developer':
            return (True,
                "Read `.claude/workflow/TODOS.md` to see the current status, then read `.claude/workflow/TEST_PLAN.md` for test scenarios. "
                "Use the **tester** agent to start Phase 3 (Functional Testing). "
                "Tester should execute functional tests using MCP tools and update TODOS.md with results.")

    # Phase 3: Testing completed
    if todos_status['phase3_complete']:
        if agent_completed == 'tester':
            # All tests passed -> Complete
            if todos_status['phase3_status'] == 'passed':
                return (False, None)  # Let workflow finish naturally

            # Tests failed -> Enter debug loop
            if todos_status['phase3_status'] == 'failed':
                iteration = todos_status['debug_iteration']

                # Max iterations reached
                if iteration >= MAX_DEBUG_ITERATIONS:
                    print(f"[Workflow DM] Max debug iterations ({MAX_DEBUG_ITERATIONS}) reached", file=sys.stderr)
                    return (False, None)

                # Start debug cycle
                return (True,
                    f"Functional tests failed (Debug Iteration {iteration + 1}/{MAX_DEBUG_ITERATIONS}). "
                    f"Read `.claude/workflow/TODOS.md` Phase 4 for failure details. "
                    f"Use the **debugger** agent to analyze the test failures and provide fix recommendations.")

    # Debug loop: Debugger completed -> Developer fixes
    if agent_completed == 'debugger':
        return (True,
            "Read `.claude/workflow/TODOS.md` Phase 4 for the debugging analysis. "
            "Use the **developer** agent to implement the recommended fixes. "
            "Follow TDD: write/update tests if needed, then fix the code.")

    # Debug loop: Developer completed fixes -> Re-test
    if agent_completed == 'developer' and todos_status['debug_iteration'] > 0:
        iteration = todos_status['debug_iteration']
        return (True,
            f"Fixes implemented. Read `.claude/workflow/TEST_PLAN.md` for test scenarios. "
            f"Use the **tester** agent to re-run functional tests (Re-test Iteration {iteration}). "
            f"Update TODOS.md Phase 3 status based on results.")

    # Unknown or intermediate state - don't interfere
    return (False, None)


def should_continue_workflow_legacy(agent_completed, test_status, debug_iterations):
    """
    LEGACY decision logic for backward compatibility.
    Used when TODOS.md doesn't exist or can't be parsed.

    Returns: (should_block, reason)
    """
    MAX_DEBUG_ITERATIONS = 5

    # Planner finished -> Start development
    if agent_completed == 'planner':
        return (True, "Use the **developer** agent to implement the plan created by the planner. Pass the complete implementation plan to the developer.")

    # Developer finished (initial implementation) -> Run tests
    if agent_completed == 'developer' and debug_iterations == 0:
        return (True, "Use the **tester** agent to verify the implementation. The tester should run all relevant tests and report results clearly.")

    # Developer finished (after fixes) -> Re-run tests
    if agent_completed == 'developer' and debug_iterations > 0:
        return (True, f"Use the **tester** agent to re-run tests after the fixes (Iteration {debug_iterations}). Verify if the issues are resolved.")

    # Tester finished with PASSED tests -> Complete!
    if agent_completed == 'tester' and test_status == 'passed':
        return (False, None)

    # Tester finished with FAILED tests -> Debug and fix
    if agent_completed == 'tester' and test_status == 'failed':
        if debug_iterations >= MAX_DEBUG_ITERATIONS:
            return (False, None)

        return (True, f"Tests failed (Iteration {debug_iterations + 1}/{MAX_DEBUG_ITERATIONS}). Use the **debugger** agent to analyze the failures and identify root causes.")

    # Tester finished with NO TESTS -> Continue based on manual testing
    if agent_completed == 'tester' and test_status == 'no_tests':
        return (False, None)

    # Debugger finished -> Apply fixes
    if agent_completed == 'debugger':
        return (True, "Use the **developer** agent to implement the fixes recommended by the debugger. Pass the complete debugging analysis to the developer.")

    # Unknown state - don't interfere
    return (False, None)


def main():
    """Main hook execution."""
    try:
        # Read hook input from stdin
        hook_input = json.load(sys.stdin)

        # Extract transcript path
        transcript_path = hook_input.get('transcript_path', '')
        if not transcript_path:
            # No transcript available, exit gracefully
            sys.exit(0)

        # Read recent transcript
        transcript = read_recent_transcript(transcript_path)

        # Check if we're in an auto-dev workflow
        if not is_in_auto_dev_workflow(transcript):
            # Not in auto-dev, don't interfere
            sys.exit(0)

        # Detect which agent just completed
        agent_completed = detect_agent_type(transcript)
        print(f"[Workflow DM] Agent completed: {agent_completed}", file=sys.stderr)

        # Try to read TODOS.md for improved decision making
        todos_content = read_todos_file()
        todos_status = parse_todos_status(todos_content) if todos_content else None

        if todos_status:
            print(f"[Workflow DM] Using TODOS.md for decision making", file=sys.stderr)
            print(f"[Workflow DM] Current phase: {todos_status['current_phase']}", file=sys.stderr)
            print(f"[Workflow DM] Phase1 complete: {todos_status['phase1_complete']}", file=sys.stderr)
            print(f"[Workflow DM] Phase2 complete: {todos_status['phase2_complete']}", file=sys.stderr)
            print(f"[Workflow DM] Phase3 complete: {todos_status['phase3_complete']}", file=sys.stderr)
            print(f"[Workflow DM] Phase3 status: {todos_status['phase3_status']}", file=sys.stderr)
            print(f"[Workflow DM] Debug iteration: {todos_status['debug_iteration']}", file=sys.stderr)

            # Use new TODOS-based decision logic
            should_block, reason = should_continue_workflow_v2(todos_status, agent_completed)
        else:
            # Fall back to legacy transcript-based logic
            print(f"[Workflow DM] TODOS.md not available, using legacy logic", file=sys.stderr)
            test_status = detect_test_status(transcript)
            debug_iterations = count_debug_iterations(transcript)

            print(f"[Workflow DM] Test status: {test_status}", file=sys.stderr)
            print(f"[Workflow DM] Debug iterations: {debug_iterations}", file=sys.stderr)

            should_block, reason = should_continue_workflow_legacy(
                agent_completed,
                test_status,
                debug_iterations
            )

        if should_block and reason:
            # Block and provide next instruction
            output = {
                "decision": "block",
                "reason": reason
            }
            print(json.dumps(output))
            print(f"[Workflow DM] Blocking with: {reason}", file=sys.stderr)
        else:
            # Allow natural completion
            print(f"[Workflow DM] Allowing completion", file=sys.stderr)
            sys.exit(0)

    except Exception as e:
        # Log error but don't interfere with workflow
        print(f"[Workflow DM] Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
