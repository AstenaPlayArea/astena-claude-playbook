---
name: iFacto.code-review
description: 'Review AL (Business Central) code the way an iFacto devlead reviews a PR: your working tree or branch diff (local mode) or an Azure DevOps PR by id (pr mode), against the iFacto review rulebook shipped with this skill - rules and exceptions learned from real PR reviews - with the finding gate, the depth limit, ranked findings tied to a rule id or marked opinion, a requirement check against Jira, and a one-word recommendation. Never posts to DevOps, never votes. Use when: "review my changes", "review this branch", "pre-review before I open a PR", "review PR 23139 from iFactoCustomers", "what would the devlead say about this", or from iFacto.CodeReviewer.'
---

# iFacto code review

_Generated from CodeReview Nexus (repository `CodeReviewBrain` until its rename; `export/code-review/SKILL.md`) by `scripts/export-guidelines.py`.
Do not edit here; edit in the Nexus and re-export. The rulebook under `references/` is a snapshot
of the Nexus' `rules/` and `exceptions/` (Nexus commit in `references/MANIFEST.json`), so a
review needs nothing online and no access to the Nexus._

## Purpose

Turn a set of changed AL files plus their requirement into something the author or a devlead
can act on in one read: what the change does, whether it delivers what was asked, what is wrong
with it, and what to do about it. Every finding names the rule it rests on or says `opinion`.
The review never publishes, never votes, and never claims context it did not have.

This is the same procedure the iFacto devleads run in CodeReview Nexus before they comment on a
PR. Running it yourself first means the devlead's review finds nothing you could have found.

## The rulebook

Everything is in this skill folder (`~/.claude/skills/iFacto.code-review/` for Claude Code,
`~/.copilot/skills/iFacto.code-review/` for Copilot). Nothing is fetched.

- `references/rulebook.md` - every active rule in one line each, grouped by category, with
  severity, confidence (`conf` = how many devlead-confirmed hits on real PRs) and a `Detect:`
  hint; then **every active exception in full**. **Read this file once, in full, at the start
  of every review.**
- `references/rules.md` - the full text of every rule, one `## <id>` section each: rationale,
  good/bad AL, history with the devlead quotes that created it. Open the section of a rule
  **only** when you are about to fire it or seriously considered it. Never read the file whole.
- Exceptions are "looks like a violation, accepted because ...". A finding that matches one is
  suppressed and the exception id is cited. Exceptions with `rule: opinion` suppress whole
  classes of opinion findings (telemetry, analyzer overflow guards, translation wording, ...).
- `references/` is **read-only** and generated. A rule you disagree with, a rule that fired
  wrongly, or a rule you think is missing is feedback for your devlead: rules change only in
  CodeReview Nexus, when a devlead judges a finding on a real PR, and reach this folder with the
  next export. Never edit `references/`.

## Modes and inputs

- **local** (default): no arguments, or "review my changes" / "review this branch". Scope is
  the current branch against its target plus uncommitted changes.
- **pr**: an org (`iFactoApps` or `iFactoCustomers`) and a PR id, or a PR URL. Needs `az` with
  the `azure-devops` extension and `az login`. If only a number is given, ask which org.

Never review more than one target per invocation and never look at other PRs.

## Step 1 - Scope

### local

1. Target branch: `master` if `origin/master` exists, else `main`. Say which.
2. Changed files, in three groups, each with a `git` command you actually ran:
   ```bash
   git diff --name-status $(git merge-base origin/<target> HEAD)...HEAD   # committed on the branch
   git diff --name-status                                                  # unstaged
   git diff --name-status --cached                                         # staged
   ```
   Merge the lists. If everything is empty, say so and stop.
3. Classify: **production AL** (`.al` outside any test app - a folder whose `app.json` has
   `"target": "Test"`... or, at iFacto, simply a `Test/` sibling of `App/`), **test AL**, and
   **non-AL** (`app.json`, `nuget.json`, `.xlf`, docs). Non-AL files are listed, not reviewed,
   except `nuget.json` and `app.json` (dependency rules apply) and `.xlf` (translation-only
   changes have their own exception).
4. Diff for the review: `git diff <merge-base>...HEAD -- <file>` per production `.al` file,
   plus the working-tree diffs. Deleted files: name them; renamed files: the new path.
5. **Build gate.** The PR pipeline fails on any compiler error **or warning**, so a devlead never
   looks at a change that does not build clean - and neither does this review. Build every AL
   project with a changed `.al` or `app.json` (the folder holding `app.json`: `App/`, and `Test/`
   when test AL changed) with the AL MCP: `al_build`, then `al_getdiagnostics`. When it answers
   *No projects are loaded*, `al_addproject` that folder first. Count errors and warnings over
   the **whole project**, not only the changed files - the pipeline does. Info and hints do not
   count.
   - **Any error or warning stops the review.** Report the context line, a `## Build` section
     with every error and warning as `<code> - <path>:<line> - <message>`, and recommendation
     `fix` ("build not clean: <e> errors, <w> warnings - fix them, then re-run the review").
     No rulebook, no findings: they come after the build is clean.
   - Zero errors and zero warnings: continue, and put `build clean (0 errors, 0 warnings)` in the
     context line.
   - The build cannot run (AL MCP missing, symbols missing, compiler crash): stop and report why
     under `## Not fetched / problems`. An unknown build is not a clean build.
   - Silencing a warning (`#pragma warning disable`, a ruleset entry, a lowered severity) does not
     fix it. A suppression the diff adds is a finding (`opinion`, `should-fix`) unless the line
     carries a comment saying why the warning does not apply.

### pr

1. Metadata:
   ```bash
   az repos pr show --org https://dev.azure.com/<org> --id <pr> -o json
   ```
   Take `title`, `description`, `sourceRefName`, `targetRefName`, `repository.{id,name,project.name}`,
   `lastMergeSourceCommit.commitId`, `lastMergeTargetCommit.commitId`, `isDraft`, `status`,
   `reviewers[].{displayName,vote,isRequired}`, `createdBy.displayName`.
2. **Build gate.** The validation build comes from policy evaluations, not the build list:
   ```bash
   az devops invoke --org https://dev.azure.com/<org> --area policy --resource evaluations \
     --api-version 7.1-preview --route-parameters project=<project> \
     --query-parameters "artifactId=vstfs:///CodeReview/CodeReviewId/<projectId>/<pr>" -o json
   ```
   The entry with `configuration.type.displayName == "Build"` carries `status`
   (approved / rejected / queued / running / broken) and `context.isExpired`. **A red build
   (rejected / broken) stops the review**: report the build line and its link and stop. A devlead
   will not look at the PR before it is green, so neither should this. Queued / running: say so
   and stop unless the user says to review anyway. Expired or approved: review, and say which in
   the context line. Completed and abandoned PRs are exempt from the gate.
3. Review threads, so you know what humans and the CI bot already raised:
   ```bash
   az devops invoke --org https://dev.azure.com/<org> --area git --resource pullRequestThreads \
     --api-version 7.1 --route-parameters project=<project> repositoryId=<repoId> pullRequestId=<pr> -o json
   ```
   Threads by "Project Collection Build Service" are the CI "AI Code Review" bot, not a human
   verdict. A finding a human or the bot already raised in an open thread is kept but tagged
   "already raised by <who>, thread <id>".
4. Code. If the current workspace is a clone of that repository, fetch the two commits and diff:
   ```bash
   git fetch origin <lastMergeTargetCommit> <lastMergeSourceCommit>
   git diff -M --name-status <lastMergeTargetCommit>...<lastMergeSourceCommit>
   git show <lastMergeSourceCommit>:<path>        # after-state of a touched file
   ```
   Otherwise clone bloblessly into a temp folder first
   (`git clone --filter=blob:none --no-checkout https://dev.azure.com/<org>/<project>/_git/<repo>`;
   the `az` login's credential helper serves the token) and do the same there. Never review from
   the diff header alone; every cited line comes from a file you read this session.
5. Classify files exactly as in local mode.

## Step 2 - The requirement (Jira)

Take every key matching `[A-Z][A-Z0-9]+-\d+` from the branch name (local) or from the PR title
and source branch (pr). For each key, read the issue **and its comment thread** - at iFacto the
scope is routinely refined, reversed or narrowed in the comments, QA feedback lands there, and
superseding PRs are announced there. Newest intent wins; say so when the thread reversed an
earlier decision.

- Preferred: the Jira MCP tool `jira_get` on `/rest/api/2/issue/<KEY>` (v2, not v3: v2 returns
  description and comments as plain text) with
  `fields=summary,description,status,issuetype,comment,subtasks,issuelinks,parent`.
- Fallback: the Atlassian Rovo connector's `getJiraIssue` with `cloudId: ifacto.atlassian.net`
  and the same fields.
- No Jira access at all: ask the user to paste the issue, or review without it and say so in
  the context line. **Never invent a requirement.** A key that does not resolve is reported as
  such, and a code-like token that happens to match the pattern (an ECF message code, an error
  id) is not a Jira key - say so and move on.

## Step 3 - Read the code

Read the diff, then **every touched production `.al` file in full** (after-state), never the diff
alone: a finding needs the object around the changed lines. Test `.al` files are read at
signature and label level, to judge coverage of the changed branch, not line by line. Callers,
callees, dependency objects and permission sets are opened only when a rule about dependency
usage, an API contract or permissions needs them - use the AL symbol tools
(`al_find_references`, `al_symbolsearch`, `al_get_object_definition`) when they are available,
otherwise `grep`.

Identify every AL object with full type, id and name: `Codeunit 50100 "Sales Post Ext"`.

## Step 4 - Depth limit: the diff and what it directly touches, nothing further

A devlead spends ten minutes on a PR. Match that. **Out of scope:**

- Tracing hypothetical paths through Base Application or dependency source to construct a
  defect the diff does not contain.
- Auditing every read for `SetLoadFields` or `ReadIsolation`. Those rules fire on a read the
  diff **adds inside a loop over a growing set**, not on a one-off `Get` or `FindFirst`. Never
  list five of them as one finding.
- Historical or migration data: whether existing rows get backfilled is functional-test
  territory.
- Test-suite completeness auditing: one missing test on a changed branch is worth a line;
  enumerating what else could be covered is not.
- Analyzer territory: CodeCop `AA*`, AppSourceCop `AS*`, PerTenantExtensionCop, missing
  affixes, possible-overflow clamps. CI runs the analyzers; the review does not repeat them.

**In scope:** the changed lines and the objects they live in; whether the change does what the
requirement asked; a defect visible in the diff or in the object the diff changes; a control or
validation the diff switches off; and the rulebook applied to the changed code. When something
out of scope looks genuinely dangerous, one line under `## Notes`, no finding, no severity.

## Step 5 - The finding gate: harm or requirement, or it is not a finding

Every finding passes at least one of two tests:

- **Harm:** name who is hurt and how - a user losing data, wrong numbers on a document, a
  control silently bypassed, a job failing silently, a maintainer misled by code. "A document
  and the code disagree" is not harm.
- **Requirement:** name the Jira item, comment, or rulebook rule it violates.

A capability nobody asked for and nothing breaks without is not a finding; at most one line in
the Overview. **A documentation or comment inaccuracy is never a finding on its own** - not the
PR description, not a design doc, not a changelog, not a handover comment to a customer. If the
code is right and only the prose is wrong, one line under `## Notes`, no severity, no number.

## Step 6 - Apply the rulebook

For each touched object and each rule in the digest, decide hit / no hit. Before raising a hit,
check every exception whose `rule` matches (and every `rule: opinion` exception for opinion
findings); a suppressed finding is listed under `## Suppressed by exception` with the exception
id, never dropped silently. Rules with `status: retired` are not in the digest and are ignored.

Opinions - findings with no rule behind them - are allowed for real defects: logic errors,
obvious bugs, misuse of a dependency's API, a requirement not met. Mark them `opinion`. Never
dress an opinion as a rule, and never give an opinion the weight of a rule.

## Step 7 - A predicted defect is a test to write, not an argument

When a finding says "this *would* happen" rather than "this *does* happen" - the path is
reachable but was not observed, the consequence is reasoned from source rather than from a run -
mark it `(predicted)` after the severity, and make the **Fix** the AL test that settles it,
written out with `[GIVEN]/[WHEN]/[THEN]` and the expected result stated. Green disproves the
finding cheaply; red proves it and becomes the regression test. A finding that needs a future
code change to become reachable is still not a finding.

## Step 8 - Rank and report

`blocking` > `should-fix` > `nit`; within a severity, rule-backed before `opinion`. Number the
findings F1, F2, ... in that order. Then write the report below.

## Report format

```
**Context:** <what was read: files, after-state, Jira, threads, build> - <what was not available>

## Overview
2-5 sentences of plain language: the problem the change solves, the mechanism it uses, and the
blast radius (which objects, which module, whether it touches a posting or release path).
Then one line of counts: files, new/changed objects by type, test objects.

## Requirement <KEY> - <summary> (<status>)
**Asked:** 2-4 bullets from the description AND the comment thread, newest intent winning.
**Covered:** what the diff delivers against each asked item.
**Missing / deviating:** asked items with no code, or solved differently than asked. Material
ones are also a finding (`opinion`).
**Beyond scope:** code no asked item calls for.
(one block per key; "no Jira key in branch or title" when there is none)

## Links            (pr mode only: the PR, every Jira issue, the build, every thread cited)

## Findings
### F<n> - <rule-id | opinion> - <blocking | should-fix | nit>[ (predicted)] - <path>:<line>
**Object:** <Type Id "Name">
**Finding:** what is wrong, citing the source you read; for a rule, one phrase of why the rule
applies here; for harm, who is hurt and how.
**Fix:** the minimal change. For a (predicted) finding, the AL test that settles it.

## Notes                      prose-only problems, one line each, no severity
## Suppressed by exception    finding-shaped things an exception id suppressed
## Already raised             (pr mode) findings a human or the CI bot already raised, with thread id
## Rules checked
<n> rules checked, <k> fired. At most five near-misses a devlead might expect to have fired,
one line each with why they did not. Never an inventory of every non-hit.
## Not fetched / problems     Jira unreachable, build state unknown, files not read, tools missing
## Recommendation
`<one word>` - one sentence of why, naming the finding or gap that drives it.
```

Every PR, Jira issue, build and thread named anywhere in a pr-mode report is a markdown link on
first mention (PR: `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`;
Jira: `https://ifacto.atlassian.net/browse/<KEY>`; thread: the PR URL plus
`?discussionId=<threadId>`). Never make the reader look up a number.

## Length budget

Target 80 lines, hard ceiling 120. Overview 3-5 sentences plus one line of counts; Requirement
4 bullets per key; Rules checked 1 line plus at most 5 near-misses. **Findings have no budget -
they are the part with value.** Over the ceiling, cut Overview and Rules checked, never the
findings.

## Recommendation vocabulary (pick exactly one)

| Word | When |
|---|---|
| `approve` | No blocking and no should-fix finding, and the requirement is covered. Nits may remain. |
| `fix` | Should-fix findings or a minor requirement gap. Author addresses, then it is fine. |
| `block` | A blocking finding, or a material requirement with no code behind it. Do not merge as is. |
| `split` | The change mixes unrelated concerns, or the requirement is far wider than the change and the rest needs its own items. |
| `triage` | (pr mode) Already completed or abandoned, and findings exist. A post-merge decision. |
| `close` | (pr mode) Superseded by another PR, or stale past usefulness. Say which PR supersedes it. |

## Hard rules (override anything above)

- **Never post to DevOps, never vote, never change a PR.** This skill only reads. The
  developer or devlead decides what to do with the report.
- **The first line of every report is the context line.** Never claim more than was read.
- **File and line come from a file read this session.** No line numbers from memory or from the
  diff header alone.
- **Every finding carries a rule id that exists in `references/rulebook.md`, or the word `opinion`.**
- **Exceptions are cited, never silently applied. Retired rules are ignored.**
- **A red validation build stops a pr-mode review. A local build with any error or warning
  stops a local-mode review.** Warnings are fixed first, never reviewed around.
- **A requirement gap is reported as a gap, never invented**: quote or paraphrase the asked
  item. When the comment thread narrowed the scope, the narrowed scope is the requirement.
- **Analyzer territory is not reviewed as findings.** Analyzer warnings are caught by the build
  gate, which stops the review until they are fixed.
- **`references/` is never edited.** Disagreement with a rule goes to your devlead, who judges
  it on a real PR in CodeReview Nexus; that is the only place the rulebook learns.

## After the report

In local mode, offer to hand the findings to `iFacto.ALCoder` for fixing, then re-run this
skill on the corrected files. In pr mode, say that posting a comment or voting is the devlead's
call, made in CodeReview Nexus - this skill has produced a report, not a review of record.
