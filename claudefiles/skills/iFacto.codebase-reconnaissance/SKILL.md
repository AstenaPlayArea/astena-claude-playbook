---
name: iFacto.codebase-reconnaissance
description: 'Discover existing objects, baseline errors, and extension points before writing or designing code. Use when: starting any AL implementation, designing solutions, reviewing code context. Replaces ad-hoc symbol/diagnostic discovery steps.'
---

# Codebase Reconnaissance

Standardized procedure to understand what exists before acting. Returns a structured context block.

**Requires** (always-on Required Toolset Gate, checked at Step 1): the AL symbol tools
(`al_downloadsymbols`, `al_symbolsearch`, `al_getdiagnostics` — `ms-dynamics-smb.al` in Copilot,
the AL MCP in Claude Code) and, for Step 4, `bc-code-atlas` (`bcatlas_*`). ⛔ Any of them absent or
unreachable → stop and report what unblocks it; a reconnaissance report built without them is not
a report.

## When to Use

- Before implementing a new feature (ALCoder step 1.5)
- Before writing a design document (SolutionDesigner step 3F)
- Before reviewing code for context (CodeReviewer step 1)
- Before any refactoring that touches multiple objects

## Procedure

### Step 1: Ensure Symbols Are Current

```
Run: ms-dynamics-smb.al/al_downloadsymbols
```
Ensures all dependency symbols are available for accurate search results.

### Step 2: Discover Existing Objects

```
Run: ms-dynamics-smb.al/al_symbolsearch
Query: keywords from the feature/task (object names, table names, field names, procedure names)
```

Search broadly — use multiple queries if needed:
- The primary object(s) being modified/created
- Related objects that may be affected
- Extension objects that may already exist for the target

Record:
- Objects that already exist (potential conflicts)
- Objects that can be extended
- Patterns used in similar existing code

### Step 3: Baseline Diagnostics

```
Run: ms-dynamics-smb.al/al_getdiagnostics
Scope: files you will touch or design around
```

Record:
- **Pre-existing errors** — do not compound them; flag critical ones to the user
- **Warnings** — note but don't necessarily fix
- **Clean files** — safe to modify without inheriting blame

### Step 4: Identify Extension Points

From Step 2 results, identify:
- Tables/pages marked `Extensible = true`
- Published events in codeunits you'll subscribe to
- Interfaces available for implementation
- Enums that can be extended (check extensibility property)

For every **base-application** event or procedure you will hook, follow the
`iFacto.base-app-source` skill: `bcatlas_resolve_node` + `bcatlas_get_signature` give the exact
signature to subscribe to, `bcatlas_get_neighbors` shows what the base app already does around
it and one existing subscriber to pattern after. Symbols show the declaration; the atlas shows
the behaviour. One or two calls per extension point — no sweeps.

## Output Format

Return a structured summary to the calling agent:

```
## Reconnaissance Report

### Existing Objects Found
- [list with Type + ID + Name]

### Baseline Errors (pre-existing)
- [count] errors in [files] — [critical ones flagged]

### Available Extension Points
- [events, extensible objects, interfaces]

### Conflicts / Risks
- [name clashes, objects that don't exist but were expected, etc.]
```

## Failure Handling

- If a required tool is not listed or its probe fails: ⛔ stop — Required Toolset Gate (report the server, the step that needs it, and the Playbook install command)
- If an AL tool answers *No projects are loaded in the workspace*: not a gate failure — call `al_addproject` with the workspace's AL project folder (the directory holding `app.json`; `App/` and `Test/` in the usual iFacto layout, one call each) and retry. The Playbook registers the AL MCP without project paths (AL 18.0+), so the agent loads the project.
- If `al_downloadsymbols` fails: proceed with stale symbols but warn the user
- If `al_symbolsearch` returns nothing: try alternative keywords, broader queries
- If symbols show a base-app object's declaration but not what it does: `iFacto.base-app-source` (the `bc-code-atlas` MCP) — do not infer base-app behaviour from the name
- If `al_getdiagnostics` shows project-wide build failure: flag to user before proceeding — designing/coding on a broken baseline is risky
