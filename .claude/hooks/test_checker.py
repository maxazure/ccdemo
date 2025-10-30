#!/usr/bin/env python3
"""
Test Checker Hook

This hook can be used with PostToolUse to monitor test execution
and provide additional feedback on test results.

Purpose: Validate test results and ensure proper test-fix loop execution.
"""

import json
import sys
import re


def analyze_bash_output(tool_result):
    """Analyze Bash tool output for test results."""
    output = tool_result.lower()

    # Common test success patterns
    success_patterns = [
        r'all tests? passed',
        r'\d+ passed.*0 failed',
        r'ok.*\d+ tests?',
        r'✓.*\d+ tests?',
        r'success',
    ]

    # Common test failure patterns
    failure_patterns = [
        r'failed.*\d+ tests?',
        r'\d+ failed',
        r'error',
        r'✗',
        r'assertion.*failed',
        r'expected.*but got',
    ]

    # Check for failures first (more important)
    for pattern in failure_patterns:
        if re.search(pattern, output):
            return 'failed'

    # Check for success
    for pattern in success_patterns:
        if re.search(pattern, output):
            return 'passed'

    return 'unknown'


def extract_test_command(tool_input):
    """Extract what test command was run."""
    if 'command' in tool_input:
        cmd = tool_input['command'].lower()
        # Common test commands
        if any(keyword in cmd for keyword in ['test', 'pytest', 'jest', 'mocha', 'phpunit', 'cargo test', 'go test']):
            return cmd
    return None


def main():
    """Main hook execution."""
    try:
        # Read hook input from stdin
        hook_input = json.load(sys.stdin)

        # Check if this is a test-related tool use
        tool_name = hook_input.get('tool_name', '')
        tool_input = hook_input.get('tool_input', {})
        tool_result = hook_input.get('tool_result', '')

        # Only process Bash commands (where tests typically run)
        if tool_name != 'Bash':
            sys.exit(0)

        # Check if this looks like a test command
        test_command = extract_test_command(tool_input)
        if not test_command:
            sys.exit(0)

        # Analyze the test output
        status = analyze_bash_output(tool_result)

        # Log findings
        print(f"[Test Checker] Detected test command: {test_command}", file=sys.stderr)
        print(f"[Test Checker] Test status: {status}", file=sys.stderr)

        # Provide feedback if needed
        if status == 'failed':
            # Tests failed - this info is useful for the transcript
            feedback = {
                "decision": "continue",
                "feedback": "⚠️ Test execution detected failures. The tester agent should analyze and report these failures clearly."
            }
            # Note: We use "continue" not "block" because we want the agent
            # to process the results naturally, not force immediate action
            print(json.dumps(feedback))
        elif status == 'passed':
            # Tests passed - log but don't interfere
            print(f"[Test Checker] Tests passed successfully", file=sys.stderr)
            sys.exit(0)
        else:
            # Unknown - don't interfere
            sys.exit(0)

    except Exception as e:
        # Log error but don't interfere
        print(f"[Test Checker] Error: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
