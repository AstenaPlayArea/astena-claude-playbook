---
name: iFacto.documentation-generation
description: 'Generate and maintain BC project documentation in the Docs folder. Use when: writing user guides, setup docs, test procedures, changelogs, developer reference, PR documentation. Provides folder structure rules, templates, and changelog format.'
---

# Documentation Generation

## When to Use
- Full documentation updates (new features, releases)
- Branch-specific documentation (current changes only)
- Pull request documentation
- Changelog maintenance
- Any BC project documentation task

## Folder Structure

All documentation lives in `App/Docs/`:

| Path | Purpose | Audience |
|------|---------|----------|
| `Docs/README.md` | Navigation hub with links to all docs | Everyone |
| `Docs/CHANGELOG.md` | Chronological changes by ISO week | Everyone |
| `Docs/Instructions/` | **READ-ONLY** — design documents | Developers |
| `Docs/Users/` | End-user guides | Business users |
| `Docs/Setup/` | Configuration guides | Consultants |
| `Docs/Tests/` | Manual test procedures | QA / Consultants |
| `Docs/Dev/` | Developer reference | Developers |
| `Docs/Dev/Dependencies/` | Dependency documentation | Developers |

### Folder-Specific Rules

**`Docs/Users/`** — End-user documentation for Business Central users:
- Write for business users navigating the BC UI
- Focus **only on customizations and changes** in this app — do NOT describe generic standard BC behavior, except where needed to contrast with what changed
- Document field names (as shown in UI), page names, navigation paths, and business workflows
- NO AL code, object IDs, or technical jargon

**`Docs/Setup/`** — Configuration guides for consultants:
- Document ALL setup fields found in setup pages/tables
- Include prerequisites, expected values, and effect of each setting
- Include cross-references to Users/ docs using relative markdown links

**`Docs/Tests/`** — Manual test procedures for QA and consultants:
- Write for functional consultants performing manual tests in the BC UI
- **NEVER reference test codeunits, test procedures, or AL code**
- Each document covers ONE functional area
- Include: business scenarios, prerequisites, step-by-step UI procedures, expected results, edge cases

**`Docs/Dev/`** — Developer reference only:
- Technical implementation details, architecture notes
- Known technical issues (from `ms-dynamics-smb.al/al_getdiagnostics` findings)
- Dependency documentation

**Constraints:**
- NEVER modify files outside `App/Docs/`
- NEVER modify `App/Docs/Instructions/` (read-only)
- NEVER ask whether to create/update — always do it
- Always use clickable markdown links for cross-references

## Changelog Rules

### Format
Group by ISO week: `## YYYY.WW` (newest first)

### JIRA Integration
- JIRA keys as clickable links: `[KEY-123](https://ifacto.atlassian.net/browse/KEY-123)`
- Use JIRA issue summary as entry text — NOT commit messages
- Group entries by JIRA issue + author
- Normalize author names; combine multiple commits per issue
- One-sentence summary per entry

### Entry Format
```markdown
## 2025.47

- [BEG-123](https://ifacto.atlassian.net/browse/BEG-123) - Added warehouse receipt validation for cross-docking scenarios (John) [See: Setup/warehouse-config.md](Setup/warehouse-config.md)
```

## Code Verification (MANDATORY)

**Requires** (always-on Required Toolset Gate): the AL symbol tools (`al_symbolsearch`,
`al_getdiagnostics`) and, for standard-behaviour statements, `bc-code-atlas`. ⛔ Absent or
unreachable → stop before writing; report what unblocks it. Documentation written without
verification against code is not iFacto documentation.

Before writing any documentation:
1. Run `ms-dynamics-smb.al/al_symbolsearch` to enumerate existing objects
2. Run `ms-dynamics-smb.al/al_getdiagnostics` to check build health
3. Read actual implementation code with `read_file`, `grep_search`
4. Verify ALL field names, captions, procedures, workflows, setup fields, page names
5. For statements about **standard Business Central behaviour** that the documented feature relies on or changes (what the base app does before/after an event, which standard validation runs), follow the `iFacto.base-app-source` skill and cite the corpus (`w1-28`)
6. **NEVER assume** — always verify against actual code

## Templates

See [references/templates.md](./references/templates.md) for full documentation templates for each folder type.

## General Writing Rules
- Professional, neutral language
- Short, scannable sections
- No AL code in Users/ docs (business-user audience)
- No technical jargon in Tests/ docs (functional consultant audience)
- Include `[VERIFY]` or `[TODO: Check with team]` ONLY when info is truly unavailable
- JIRA keys always as clickable links
