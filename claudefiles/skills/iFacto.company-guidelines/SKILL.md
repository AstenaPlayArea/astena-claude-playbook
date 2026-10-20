---
name: iFacto.company-guidelines
description: 'Load and apply the iFacto company AL rules from the installed BCQuality knowledge base (custom layer). Use BEFORE designing or writing any AL code, and when validating code against company standards. Replaces the retired "waldo-company" specialist. Use from iFacto.SolutionDesigner, iFacto.ALCoder, iFacto.CodeReviewer, and iFacto.Documentation.'
---

# iFacto Company Guidelines (via BCQuality)

iFacto's company-specific AL rules live in the **custom layer of the BCQuality knowledge
base** — a git-based fork of [microsoft/BCQuality](https://github.com/microsoft/BCQuality)
installed on every developer machine as a plugin for both GitHub Copilot and Claude Code.

This skill returns **rule articles, NOT ready-made answers**. After loading the rules,
YOU apply each one to the task at hand as a MANDATORY constraint. Company rules override
general BC practice when they conflict — no exceptions, they are not negotiable.

## Step 1 — Locate the installed BCQuality knowledge base

Resolve `BCQUALITY_ROOT` to the first of these that exists (a valid root contains
`custom/knowledge/` and `.claude-plugin/plugin.json`):

1. The `BCQUALITY_ROOT` environment variable, when set.
2. The Claude Code plugin install — the directory containing `.claude-plugin/plugin.json`
   for the `bcquality` plugin, typically under `~/.claude/plugins/marketplaces/bcquality`
   or `~/.claude/plugins/cache/bcquality/bcquality/<version>`.
3. The iFacto Playbook extension's local clone: `~/.ifacto-playbook/bcquality/<profileId>`
   (e.g. `~/.ifacto-playbook/bcquality/iFactoBE`) — this is the path registered with
   VS Code's agent-plugins feature, so it is the one that exists for Copilot users.

**If none exists, STOP** and tell the user:
> BCQuality is not installed. Run **"iFacto: Install / Update BCQuality Knowledge Base
> (Copilot + Claude)"** from the VS Code Command Palette, then retry.

Do not continue without the knowledge base — do not answer company-standards questions
from memory.

## Step 2 — Discover the applicable rules

1. If `BCQUALITY_ROOT/knowledge-index.json` exists, read it and select every entry with
   `layer: custom`. Otherwise enumerate `BCQUALITY_ROOT/custom/knowledge/**/*.md` directly.
2. Filter to the articles whose `domain` and `keywords` frontmatter match the current
   task (writing a codeunit → `style`; UI work → `ui`; etc.). When in doubt, include the
   article — company rules are cheap to check and expensive to miss.
3. For broader BC guidance beyond company rules, the `microsoft/knowledge/` and
   `community/knowledge/` layers of the same tree are available — consult them per the
   matching rules in `BCQUALITY_ROOT/skills/read.md`.

**Enumerate the layer — never assume a fixed rule list.** New company rules land in the
fork's `custom/knowledge/` and must apply automatically without editing this skill.

## Step 3 — Read the selected articles IN FULL

The index is discovery metadata only. Read each selected `.md` article completely,
including its sibling `.good.al` / `.bad.al` sample files — the samples are the
authoritative expression of the pattern.

## Step 4 — Apply as MANDATORY constraints

Apply every applicable rule to the design or code, and report explicitly per rule:

```
✅ {rule id}: PASS
   Line {N}: {evidence of compliance}

❌ {rule id}: FAIL
   Line {N}: {violation}
   CORRECTION: {exact fix}
```

- When designing: state each applicable rule as a design constraint in the document.
- When writing code: apply the `.good.al` pattern as you write; never emit the `.bad.al` pattern.
- When reviewing: produce the ✅/❌ list with line references; ❌ on a company rule blocks merge.

## Transitional appendix — rules not yet migrated to the fork

> ⚠️ **Delete each entry below as soon as its article lands in the fork's
> `custom/knowledge/` (migration "fase 2").** Until then these iFacto rules are not in
> BCQuality yet and MUST still be enforced from this list. Same authority as custom-layer
> articles: MANDATORY, merge-blocking.

1. **Error handling (CRITICAL)** — ALL `Error()`, `Message()`, and `Confirm()` calls MUST
   use Label variables, never hardcoded strings. Naming: `<Context>Err` / `<Context>Msg` /
   `<Context>Qst`, with a `Comment` attribute for placeholders.
2. **Enum extensibility** — enums are `Extensible = false` by default. `Extensible = true`
   ONLY when the enum implements an interface or is explicitly designed (and documented)
   for extension.
3. **Upgrade/install synchronization (CRITICAL)** — upgrade logic MUST be implemented as
   public procedures in the upgrade codeunit and called from the install codeunit; if an
   upgrade codeunit exists, an install codeunit MUST exist too.
4. **Naming conventions (beyond file naming)** — PascalCase, English-only identifiers AND
   captions (translations via .xlf only), temporary records prefixed `Temp`, variable
   declaration order: Record → Report → Codeunit → other types.
5. **Pages contain no local business logic** — page/pageextension triggers delegate to
   codeunits; no business logic in local page procedures.
6. **No PowerShell files inside the app** — `.ps1` files never ship inside an AL app
   folder.

(Already migrated to the fork and therefore NOT listed here: one object per file,
tableextension `PTE` suffix, the three Meth-codeunit rules, AL file naming, progress
dialogs for long-running loops. Documentation standards live in the
`iFacto.documentation-generation` skill, not in BCQuality.)

## Related

- **Code review**: the `iFacto.code-review` skill (the devleads' review procedure and
  rulebook, generated from CodeReviewBrain) and the `iFacto.CodeReviewer` agent, which runs
  it first and then the `al-code-review` skill that ships inside the BCQuality plugin
  (technical, all layers; it returns a findings-report citing knowledge articles per finding).
- **Proposing a new company rule**: PR to the BCQuality fork's `custom/knowledge/`
  following `BCQUALITY_ROOT/skills/write.md` — never add rules to this skill.
