# task-auditor

Audits and validates `task.json` against `app_spec.md` to ensure complete coverage of requirements and quality standards. Use this skill after `task.json` is generated but before executing tasks.

## When to use

Use this skill when:
- `task.json` has been generated from `app_spec.md`
- You need to verify all features in `app_spec.md` are covered
- You want to ensure task quality before execution begins
- Performing a pre-execution review (recommended before running auto-bot)

## Instructions

1. Read `docs/app_spec.md` to understand the full project requirements
2. Read `task.json` to see all generated tasks
3. Perform a comprehensive audit following the checklist below
4. Report findings to the user
5. Suggest corrections if needed

## Audit Checklist

### 1. Coverage Check (Mandatory)

For each feature in `app_spec.md`, verify:
- [ ] A corresponding task exists
- [ ] Task description covers the feature adequately
- [ ] No features are missing or overlooked

#### Coverage Report Format:
```
## Coverage Analysis

| Feature in app_spec.md | Covered by Task | Status |
|------------------------|-----------------|--------|
| Feature A | task-1 | ✅ |
| Feature B | task-2 | ✅ |
| Feature C | - | ❌ MISSING |
```

### 2. Quality Check (Mandatory)

Each task must have:
- [ ] Clear, actionable description
- [ ] At least one VERIFICATION step (steps that verify the task works)
- [ ] Realistic steps that can be executed

#### Quality Issues to Flag:
- Tasks without verification steps
- Vague descriptions like "implement X" without specifics
- Steps that cannot be verified

### 3. Documentation Check (Mandatory)

Verify that documentation tasks exist:
- [ ] README update task for single-package projects
- [ ] README update tasks for ALL packages in monorepo
- [ ] Documentation tasks depend on implementation tasks

#### Documentation Task Requirements:
- Must use `git diff` or similar to detect changes
- Must update affected package READMEs
- Must come AFTER all implementation tasks (via `dependsOn`)

### 4. Dependency Check

- [ ] No circular dependencies
- [ ] Dependencies are correctly ordered (foundational → advanced)
- [ ] Independent tasks can run in parallel

### 5. Verification Step Check

Each task MUST have verification steps. Examples:
```
✅ Good:
- "Create src/index.ts with hello function"
- "VERIFY: npm run build succeeds"
- "VERIFY: node src/index.js outputs 'Hello'"

❌ Bad:
- "Implement feature X" (no verification)
- "Write tests" (too vague)
```

## Output Format

After auditing, provide:

```markdown
## Task Audit Report

### Summary
- Total Tasks: X
- Coverage: X/Y features covered (X%)
- Quality Issues: X
- Documentation Tasks: X

### Issues Found
1. **[CRITICAL]**: Missing task for [feature]
2. **[HIGH]**: Task [id] lacks verification steps
3. **[MEDIUM]**: Documentation task missing for [package]

### Recommendations
1. Add task for missing feature X
2. Add verification step to task Y
3. Create documentation task for package Z

### Verdict
- [ ] **APPROVED** - Ready to execute
- [ ] **NEEDS REVISION** - Fix issues above first
```

## Workflow Integration

This skill is designed for the following workflow:

```
Phase 1: Generate app_spec
  → Use app-spec-generator skill
  → Output: docs/app_spec.md

Phase 2: Generate task.json
  → Run: auto-bot <dir> --max-iterations 2
  → Output: task.json

Phase 3: Audit task.json (THIS SKILL)
  → Use task-auditor skill
  → Output: Audit report

Phase 4: Execute tasks
  → Run: auto-bot <dir> --ulw
  → Output: Completed project
```

## Examples

### Example 1: Complete Coverage
```
## Coverage Analysis
| Feature | Task | Status |
|---------|------|--------|
| User authentication | task-1 | ✅ |
| CRUD operations | task-2 | ✅ |
| File upload | task-3 | ✅ |

Verdict: APPROVED ✅
```

### Example 2: Missing Coverage
```
## Coverage Analysis
| Feature | Task | Status |
|---------|------|--------|
| User authentication | task-1 | ✅ |
| CRUD operations | - | ❌ MISSING |

Issues Found:
1. [CRITICAL] No task for "CRUD operations"
2. [HIGH] task-1 lacks verification steps

Verdict: NEEDS REVISION ❌
```

## Notes

- Always read both files before auditing
- Be thorough - missing features will cause problems during execution
- Report all issues, don't assume they'll be caught later
- This audit is optional but recommended for quality assurance
