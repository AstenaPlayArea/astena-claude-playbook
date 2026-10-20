# Documentation Templates

## Users/ — End-User Documentation

```markdown
# {Feature Name}

**Purpose:** {One-line description of what this feature does for the business user}

## When to Use
{Business scenario where this feature applies}

## How to Use

### {Step 1 Title}
1. Navigate to **{Page Name}** via {Search / Menu path}
2. {Action with field names in bold}
3. {Expected result}

### {Step 2 Title}
1. {Continue with clear steps}

## Important Notes
- {Key limitations or prerequisites}
- {Common mistakes to avoid}

## Related Features
- [{Related Feature}]({relative-link})
```

**Rules for Users/ docs:**
- NO AL code, codeunit names, or technical jargon
- Focus on customizations only (not standard BC behavior)
- Bold **field names** and **page names**
- Use numbered steps for procedures

---

## Setup/ — Configuration Guides

```markdown
# {Feature} Setup Guide

**Purpose:** {What this configuration enables}

## Prerequisites
- [ ] {Required license/permission}
- [ ] {Required base configuration}

## Configuration Steps

### Step 1: {Configuration Area}
1. Navigate to **{Setup Page Name}**
2. Set **{Field Name}** to `{value}` — {why this value}
3. {Continue}

### Step 2: {Next Configuration Area}
1. {Steps}

## Verification
- [ ] {How to verify configuration is correct}
- [ ] {Expected behavior after setup}

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| {Error or behavior} | {Root cause} | {Resolution steps} |

## Related Setup
- [{Related Setup Guide}]({relative-link})
```

---

## Tests/ — Manual Test Procedures

```markdown
# {Feature Area} Test Procedures

**Purpose:** Verify {feature} works correctly after {change/deployment}

## Test Environment Prerequisites
- [ ] {Required data or configuration}

## Test Scenarios

### Scenario 1: {Normal Operation}
**Description:** {What this tests}

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | {Open page / Enter value} | {What should happen} |
| 2 | {Next action} | {Expected outcome} |

**Result:** ☐ Pass ☐ Fail

### Scenario 2: {Edge Case}
**Description:** {What edge case this tests}

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | {Action} | {Expected result} |

**Result:** ☐ Pass ☐ Fail

### Scenario 3: {Error Handling}
**Description:** {What error scenario this tests}

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | {Trigger error condition} | {Expected error message} |

**Result:** ☐ Pass ☐ Fail
```

**Rules for Tests/ docs:**
- NO AL code, codeunits, or technical jargon
- UI-based procedures only (what user sees and clicks)
- Cover: normal operations, edge cases, error scenarios

---

## Dev/ — Developer Reference

```markdown
# {Component} Developer Reference

## Overview
{What this component does and how it fits in the architecture}

## Objects

| Type | ID | Name | Purpose |
|------|-----|------|---------|
| Table | {ID} | {Name} | {Purpose} |
| Page | {ID} | {Name} | {Purpose} |
| Codeunit | {ID} | {Name} | {Purpose} |

## Key Patterns
{Architecture decisions, patterns used, event publishers/subscribers}

## Extension Points
{How other extensions can interact with this component}
```

---

## Dev/Dependencies/ — Dependency Documentation

```markdown
# Dependency: {App Name}

| Field | Value |
|-------|-------|
| **Publisher** | {Publisher} |
| **Name** | {App Name} |
| **Version** | {Minimum version} |

## Business Justification
{Why this dependency exists}

## Objects Used
| Object | How Used |
|--------|----------|
| {Table/Page/Codeunit} | {What we use from it} |

## Code Locations
| File | Usage |
|------|-------|
| {file path} | {How it references the dependency} |

## Impact if Removed
{What breaks and why}
```
