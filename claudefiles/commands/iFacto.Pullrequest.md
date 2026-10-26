---
description: "Apply all steps to create a pull request for your new developments — includes JIRA validation, a mandatory iFacto code review, documentation, and Azure DevOps PR creation."
---

> Recommended agent: `iFacto.Documentation`

# Pull Request Documentation

Creates comprehensive pull request documentation with 5 mandatory sections.

## Step 1: JIRA Validation (MANDATORY FIRST)
1. Validate JIRA issue key is provided — **STOP and ask if missing** (NEVER fabricate)
2. Retrieve issue via `mcp-server-atlassian-jira/jira_get` → `/rest/api/3/issue/{KEY}`
3. Extract: summary, description, acceptance criteria
4. Compare PR changes to requirements: ✅ met / ⚠️ partial / ❌ not met / 🔍 scope creep
5. **Get user confirmation before proceeding**

## Step 2: Documentation Conventions
- Follow the `iFacto.documentation-generation` skill for PR documentation structure, writing style, and changelog format.

## Step 3: Change Detection
- Detect uncommitted changes + branch-specific commits (since branch created from main/master) — **these are the only files in scope**
- Run `ms-dynamics-smb.al/al_symbolsearch` scoped to the changed files only to build an accurate object inventory
- Follow the `iFacto.al-build-validation` skill (diagnostics-only) to capture build status
- If NO test files found: flag as missing automated tests — **NEVER fabricate test content**

## Step 4: Code Review (MANDATORY GATE)

Every PR goes through `/iFacto.CodeReview` before it is created: the devleads' rulebook, BCQuality's `al-code-review` and the iFacto security review over the Step 3 scope. **No review → no PR.**

### 4.1 Run it yourself — never ask, never skip
1. Start the **`iFacto.CodeReviewer`** agent yourself with the `Agent` tool, in **local mode** (current branch against its target plus uncommitted changes). Do not ask whether to run it, and do not ask the developer to run it.
2. A review from earlier in the session, or one the developer says they ran, does not count — review the code as it is now.
3. **Running as a subagent** (e.g. inside `iFacto.Documentation`): agents never nest. End the run and report to the caller that the code review must run first; the caller runs `iFacto.CodeReviewer` and restarts `/iFacto.Pullrequest` with the result.

### 4.2 Act on the recommendation
Show the developer the full report, then:
- **`approve`** → continue with Step 5.
- **`fix`** → fix the findings first (the developer, or `iFacto.ALCoder` when they say **fix them**), then re-run Step 3 and this step. A finding the developer deliberately keeps is listed in the PR description under `## Assessment` with the developer's reason — never dropped silently.
- **`block`** or **`split`** → **STOP.** Generate no PR description and create no PR. Report the blocking findings, or the proposed split, and tell the developer to re-run `/iFacto.Pullrequest` once it is resolved.
- The review fails to run (missing toolset, error) → **STOP** with the reason from the agent's report. A failed review is not an `approve`.

### 4.3 In the PR
`## Assessment` carries one line: `🔍 Code review: {recommendation} — {n} findings fixed, {m} kept (see below)`.

## Step 5: Functional Test Attestation (MANDATORY GATE)

The developer must personally confirm that the change was **functionally tested in their own environment** and vouch for it. Automated tests and a clean build do not replace this. **No attestation → no PR** — in a repository with an AL app (5.0).

### 5.0 Only for a repository with an AL app
The attestation is about running the change in Business Central. It applies whenever the repository holds an AL app: an `app.json` anywhere in it — tracked (`git ls-files "*app.json"`, `App/` and `Test/` in the usual layout), not yet added, or in a submodule.
- **An AL app exists** → the attestation is mandatory: 5.1 to 5.5, with or without a `.vscode/launch.json`. launch.json only proposes the environment URL (5.3); without a matching configuration the developer gives it.
- **No AL app** (no `app.json` anywhere in the repository) → there is nothing to run in Business Central — BCCompanyGuidelines, for instance, holds the skills themselves, not customer customisations. Skip 5.1 to 5.5 and ask nothing. `## Testing` starts with this line instead of the attestation, and Step 8 posts no attestation comment:

> ℹ️ **Functional test attestation: not applicable** — this repository holds no AL app (no `app.json`).

- **Read the repository, never take the developer's word for it.** "No need to ask" in a repository with an `app.json` does not skip the questions, and neither does a missing or moved launch.json.

### 5.1 Resolve the developer's name — never guess it
1. Jira: `mcp-server-atlassian-jira/jira_get` → `/rest/api/3/myself` → `displayName`
2. No Jira (or the call fails): `git config user.name`
3. Show the name in the question below so the developer can correct it

### 5.2 Ask — after showing the Jira acceptance criteria (Step 1) and the changed objects (Step 3)
Ask these three questions and wait for the answers:
1. *"Have you functionally tested this change in your own environment, and do you vouch that it was actually tested? (yes/no) — recorded in the name of **{name}**."*
2. *"In which environment, and what is its URL?"* (e.g. sandbox name, Docker container, OnPrem test DB). Propose the URL from `.vscode/launch.json` when a configuration matches the environment, and let the developer confirm or correct it — see 5.3.
3. *"What did you test?"* (one line, the scenarios you ran)

### 5.3 Environment URL — derive or ask, never invent
The URL lets the reviewer and the Jira reporter open the environment the change was tested in.
- **SaaS** (`"environmentType": "Sandbox"`): `https://businesscentral.dynamics.com/{tenant}/{environmentName}` — leave out `{tenant}` when the configuration has none; URL-encode the environment name (a space becomes `%20`).
- **Docker / OnPrem** (`"server"` + `"serverInstance"`): `{server}/{serverInstance}/` (e.g. `http://bcserver/BC/`).
- No matching configuration (the developer tested somewhere else): ask the developer for the URL.
- Never guess a tenant, host or environment name. The developer has no URL to give (e.g. a local container only they can reach) → record `not available` with the reason they give.

### 5.4 Rules
- **Only an explicit "yes" to question 1, asked at this gate, counts.** An earlier remark such as *"create the PR, it's tested"* is not an attestation — still ask.
- **NEVER answer on the developer's behalf** and never pre-fill "yes". A passing test run or build is not an attestation either.
- **"No", "partially", "not yet", or an evasive answer → STOP.** Generate no PR description and create no PR. Tell the developer to test first and re-run `/iFacto.Pullrequest`.
- Questions 2 and 3 need a concrete answer — "yes" or "everything" is not one. Ask again once; still vague → STOP.
- **Running as a subagent** (no channel to the developer): end the run and report to the caller that the attestation is required. Never assume it.

### 5.5 Attestation text (fixed wording — reuse verbatim in Step 6 and Step 8)
Use the developer's name, today's date (`YYYY-MM-DD`) and their answers. Do not refer to the developer as he or she; the wording below uses the name only:

> ✅ **Functional test confirmed** — On {date}, {name} confirmed that this change was functionally tested in their own environment.
> - Environment: {environment}
> - Environment URL: {url}
> - Tested: {scope}

`{url}` is the confirmed URL from 5.3 as a clickable link — markdown `[{url}]({url})` in the PR description, an ADF link mark in Jira — or `not available ({reason})`.

The attestation is always in **English**, like the rest of the PR. If the developer answers questions 2 or 3 in another language, translate the answer to English without adding, dropping or softening anything, and show the translated text to the developer before using it.

## Step 6: Generate PR Description
**Format restrictions:**
- ✅ Headings, bullet lists, emoticons, bold text
- ❌ NO code blocks, NO tables with pipes
- **HARD LIMIT: 3800 characters maximum**
- **Language: English only**: title, every section, and the Jira comments in Step 8. Never mix languages, even when the conversation with the developer is in Dutch.

**Structure:**
```
# [Emoticon] [JIRA-ISSUE]: [Title]
## Summary
## Changes
## Testing  ← starts with the Step 5 attestation text (or the 5.0 not-applicable line)
## Deployment
## Assessment (star ratings as list)
---
Commit info
```

The attestation text from Step 5 — or the not-applicable line of 5.0 — is the **first item** of `## Testing`, verbatim. It counts toward the 3800-character limit — shorten other sections, never the attestation.

## Step 7: Create PR via Azure REST API
**NEVER use `az repos pr create`** — use REST API via `az rest`.

### Encoding Rules (CRITICAL — prevents corruption of emojis and special chars)

**Windows (PowerShell):**
1. Build a hashtable with `title`, `description`, `sourceRefName`, `targetRefName`
2. Convert to JSON: `$json = $body | ConvertTo-Json -Depth 5`
3. Write to temp file **without BOM**: `[System.IO.File]::WriteAllText($tmpFile, $json, [System.Text.UTF8Encoding]::new($false))`
4. POST: `az rest --method POST --uri "https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1" --headers "Content-Type=application/json" --body "@$tmpFile"`
5. Clean up: `Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue`

**macOS / Linux (bash/zsh):**
1. Use `python3 -c` to generate the JSON file (handles all escaping safely):
   `python3 -c "import json,sys; json.dump({'title':sys.argv[1],'description':sys.argv[2],'sourceRefName':sys.argv[3],'targetRefName':sys.argv[4]}, open(sys.argv[5],'w'), ensure_ascii=False)" "$TITLE" "$DESC" "$SOURCE" "$TARGET" "$TMPFILE"`
2. POST: `az rest --method post --uri "..." --headers "Content-Type=application/json" --body @"$TMPFILE"`
3. Clean up: `rm -f "$TMPFILE"`

**NEVER use:**
- PowerShell `Set-Content -Encoding UTF8` (adds BOM on PS5)
- Here-strings with emojis directly interpolated
- `echo` or `Write-Output` piped to file (encoding varies by shell)

### Authentication failure
If `az rest` returns 401/403 → tell the user: "Azure CLI token expired. Run `az login` to re-authenticate, then retry."

### Fallback
If `az rest` fails for ANY other reason (encoding error, network, unexpected response):
1. Inform the user: "REST API failed: [error]. Please check your Azure CLI authentication and network."
2. Suggest the user retry with `az login` followed by the same `az rest` command
3. Do NOT use any MCP-based Azure DevOps tools — always use Azure CLI (`az devops`, `az repos`, `az rest`)

## Step 8: Update JIRA Issue
If JIRA was validated:
1. Add a comment with PR link + description (excluding Deployment and Assessment sections).
2. When Step 5 applied (5.0): add the Step 5 attestation text as a **separate comment** with the PR link, so it stands on its own in the issue history. It carries the environment URL; keep it a working link after the ADF conversion.
- Convert markdown to Atlassian Document Format (ADF)
- If the description comment fails: log the error but don't fail PR creation
- If the **attestation comment** fails: the PR stays, but report the failure explicitly to the developer and hand over the attestation text to paste into Jira manually — never just log it

No Jira (e.g. tooling repositories): the attestation lives in the PR description only.

## Step 9: Approval and Merge Boundaries (MANDATORY)

Creating the PR is where your authority ends. Approval is a **second pair of eyes** — a control you are not part of.

### NEVER approve a PR authored by the user
- **NEVER cast an approve vote** (`vote: 10`) on a pull request the user created, and never approve on their behalf.
- This holds **even when the branch policy allows it**. Azure DevOps reporting `creatorVoteCounts=True` on the "Minimum number of reviewers" or "Required reviewers" policy is an administrative default, **not** authorization. A policy that permits self-approval does not make it acceptable — a self-approved PR defeats the entire purpose of the review.
- The approval must come from another member of the reviewer group configured on the repository (typically a `PR Approvers` group).
- Do not offer self-approval as an option for the user to decline. Report the state and name who can approve.

### NEVER bypass a blocking branch policy
- No `bypassPolicy` / `bypassReason` on completion, no autocomplete set to dodge a pending check, no force-push to sidestep a failed gate.
- A blocking policy that has not passed is a **STOP**, not an obstacle to route around.

### "Review and merge" does NOT include approving
Read *"review and merge"* as: **prepare everything so the merge can happen the moment a real reviewer approves.**
1. ✅ The code review of Step 4 (`/iFacto.CodeReview`: the devleads' rulebook, BCQuality's `al-code-review`, the security review) has run and its findings are fixed — that is the "review". Push fixes after PR creation → run it again
2. ✅ Watch the blocking build and report its result
3. ✅ Push any fixes **immediately** — a push invalidates existing approvals, so fix before someone votes, never after
4. ⛔ **STOP** — state plainly that the merge waits on an approver, and offer to draft the request to one
5. ✅ Complete the merge only **after** someone else has approved

### Reporting the blocker
Read the real state before claiming what blocks the merge:
- Reviewer votes: `GET /_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` → `reviewers[].vote` (`0` = no vote, `10` = approved)
- Policy state: `GET /_apis/policy/evaluations?artifactId=vstfs:///CodeReview/CodeReviewId/{projectId}%2f{prId}&api-version=7.1-preview.1`

Report which policies are pending and who must vote — never infer approval state from the fact that a merge is technically possible.

## 5 Mandatory Documentation Sections
1. **JIRA Integration** — link, summary, business context
2. **Code Changes** — what changed, why, how
3. **Testing** — functional test attestation (Step 5) first, or the 5.0 not-applicable line, then automated tests, manual procedures, edge cases (⚠️ WARNING if no automated tests)
4. **Setup Guide** — prerequisites, steps, configuration
5. **Architecture Review** — honest 1-5 star ratings: Code Architecture, Code Quality, Performance, Maintainability, Extensibility

## Quality Standards
- Under 3800 characters (verify before creating PR)
- No placeholder/simulated content
- Accurate test state representation
- Code review (Step 4) run on the final code, recommendation `approve` or every `fix` finding fixed or listed with a reason
- Functional test attestation present in the PR (and in Jira when a Jira issue exists) — confirmed by the developer, never by the agent; in a repository without an AL app, the 5.0 not-applicable line instead
- Honest architecture ratings (not everything is 5 stars)
