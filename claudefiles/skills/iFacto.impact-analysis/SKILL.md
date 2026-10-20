---
name: iFacto.impact-analysis
description: 'Analyze what breaks if an object, field, or procedure changes. Use when: approving risky changes in review, before refactoring, evaluating design trade-offs. Builds dependency tree and identifies transitive risk.'
---

# Impact Analysis

Structured procedure to answer: "What breaks if I change this?"

**Requires** (always-on Required Toolset Gate, checked at Step 1): a find-references tool
(`al-mcp-server/al_find_references` in Copilot, the AL MCP equivalent in Claude Code), the AL
symbol tools, and — when a base-app procedure or event is involved — `bc-code-atlas`. ⛔ Absent or
unreachable → stop and report what unblocks it; a risk rating without the references is a guess.

## When to Use

- **CodeReviewer**: Before approving changes to shared objects (tables, interfaces, events)
- **ALCoder**: Before refactoring or renaming anything with external consumers
- **SolutionDesigner**: Evaluating trade-offs between extending vs. creating new objects

## Input

Provide one or more of:
- Object name (table, codeunit, page, enum)
- Field name (with parent table)
- Procedure/event name (with parent codeunit)
- Interface name

## Procedure

### Step 1: Find Direct References

```
Run: al-mcp-server/al_find_references
Target: the object/field/procedure being changed
```

Record all direct consumers:
- Table extensions referencing the table
- Pages showing the field
- Codeunits calling the procedure
- Event subscribers
- Permission sets granting access

### Step 2: Build Dependency Tree

For each direct consumer found in Step 1:
- Is it also consumed by others? (check one level deeper)
- Is it part of a published app (vs. same project)?
- Is it in a test app (lower risk) or production app (higher risk)?

Categorize:
- **Same-project** — you control it, can fix it
- **Cross-project dependency** — breaking change requires coordination
- **External/AppSource** — cannot fix; must maintain backward compatibility

### Step 3: Diagnostics on Affected Files

```
Run: ms-dynamics-smb.al/al_getdiagnostics
Scope: files identified as direct consumers in Step 1
```

Check: would the proposed change introduce errors in these files?

### Step 4: Test Coverage Check

Search for test codeunits that reference the target:
```
Run: al-mcp-server/al_find_references
Target: same object, filtered to Test* files
```

Or:
```
Run: ms-dynamics-smb.al/al_symbolsearch
Query: "Test" + object name
```

Flag: objects with zero test coverage that will be affected.

## Output Format

```
## Impact Analysis: [Object/Field/Procedure Name]

### Direct Consumers ([count])
| Consumer | Type | Project | Risk |
|----------|------|---------|------|
| ... | TableExt/Page/Codeunit | Same/Cross/External | Low/Med/High |

### Transitive Risk
- [objects one level deeper that may break]

### Breaking Change? YES / NO / CONDITIONAL
- YES: [what breaks and why]
- CONDITIONAL: [breaks only if X property changes]
- NO: [change is additive/safe]

### Test Coverage
- Covered: [count] test codeunits
- Uncovered consumers: [list]

### Recommendation
- [Proceed / Proceed with caution / Coordinate with dependent teams / Do not change]
```

## The Base-App Side

`al_find_references` covers the workspace and its dependency symbols. When the change touches
a **base-application** procedure or event (a subscriber you add, remove or reorder; a base-app
procedure your code mirrors or calls), follow the `iFacto.base-app-source` skill for the other
half of the picture:

- `bcatlas_get_neighbors` on the base-app node → the base-app callers and the *other*
  subscribers, so you can see what else fires on the same event and in which context
- `bcatlas_get_procedure_body` → whether the base app already handles the case (an `IsHandled`
  pattern, a validation, a commit) before your code runs

State these facts with their corpus (`w1-28` unless resolved otherwise). One or two atlas calls
per object — not a sweep.

## Edge Cases

- **No references found**: The object may be unused (candidate for removal) or references may be in unpublished symbols. For a base-app object, check its base-app callers through `iFacto.base-app-source` before declaring it unused. State this explicitly.
- **Circular references**: Flag the cycle, don't recurse infinitely.
- **Interface changes**: Always HIGH risk — all implementations must be updated simultaneously.
