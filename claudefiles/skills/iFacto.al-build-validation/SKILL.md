---
name: iFacto.al-build-validation
description: 'Build, diagnose, and fix AL code iteratively. Use when: compiling AL projects, validating code changes, pre-release health checks, post-implementation verification. Provides a reusable build→diagnose→fix loop.'
---

# AL Build Validation

## When to Use
- After generating or modifying AL code
- Pre-release health checks
- Post-version-update verification
- Collecting compiler diagnostics for code review

## Procedure

### Step 1: Build the Project
Run `ms-dynamics-smb.al/al_build` to compile the AL project.

### Step 2: Collect Diagnostics
Run `ms-dynamics-smb.al/al_getdiagnostics` to get detailed error/warning/hint information.
- **Errors**: Hard violations preventing compilation — MUST fix
- **Warnings**: Potential issues flagged by compiler — review with user
- **Hints**: Code quality signals — address if relevant

### Step 3: Fix Errors Iteratively
For each error:
1. Read the affected file and understand the error context
2. Apply the fix
3. Rebuild with `ms-dynamics-smb.al/al_build`
4. Re-run `ms-dynamics-smb.al/al_getdiagnostics` to confirm the fix and check for new issues
5. Repeat until zero errors

### Step 4: Handle Warnings
- Present warnings to the user
- Fix warnings that indicate real issues
- Document accepted warnings with rationale

### Step 5: Confirm Clean Build
- Final `ms-dynamics-smb.al/al_build` returns success
- `ms-dynamics-smb.al/al_getdiagnostics` shows zero errors
- Report: errors fixed, warnings remaining, build status

## Output Format
```
Build Status: ✅ SUCCESS / ❌ FAILED
Errors: X found → Y fixed → Z remaining
Warnings: X found → Y addressed → Z accepted
Hints: X
```

## Important
- **NEVER skip the build step** — code generation is NOT complete until build succeeds
- **NEVER silently proceed** if build is broken — always report to user
- When used for diagnostics-only (code review), skip fix steps — just collect and report
