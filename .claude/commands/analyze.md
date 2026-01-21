# /analyze

Parallel code analysis using multiple specialized agents.

## Workflow

Launch 3 agents in parallel to analyze the codebase:

### Agent 1: Security Audit
```
Task(subagent_type="general-purpose", prompt="
Analyze the codebase for security issues:
1. Check for hardcoded secrets
2. Verify input validation in Convex mutations
3. Check auth/authz patterns (Clerk + Convex)
4. Review mutation authorization logic
5. Check for XSS/injection risks

Report findings in format:
- CRITICAL: [issue]
- HIGH: [issue]
- MEDIUM: [issue]
- LOW: [issue]
")
```

### Agent 2: Performance Review
```
Task(subagent_type="general-purpose", prompt="
Analyze the codebase for performance issues:
1. Check React re-renders (missing useMemo/useCallback)
2. Review Convex query patterns (unnecessary re-fetches)
3. Check for proper use of indexes in schema
4. Review image optimization
5. Check for N+1 queries in Convex functions

Report findings with suggested fixes.
")
```

### Agent 3: Code Quality
```
Task(subagent_type="general-purpose", prompt="
Analyze code quality:
1. Check TypeScript strictness
2. Review component organization
3. Check for code duplication
4. Review error handling
5. Check accessibility basics

Report findings with refactoring suggestions.
")
```

## Expected Output

```markdown
# Codebase Analysis Report

## Security Audit
[Agent 1 findings]

## Performance Review
[Agent 2 findings]

## Code Quality
[Agent 3 findings]

## Priority Actions
1. [Highest priority fix]
2. [Second priority fix]
3. [Third priority fix]
```

## Notes

- Run before major releases
- Address CRITICAL issues immediately
- Create tickets for lower priority items
