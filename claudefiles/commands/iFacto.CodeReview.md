---
description: "Review your AL changes (working tree / branch) or an Azure DevOps PR the way an iFacto devlead does: rulebook findings with rule ids, requirement check against Jira, BCQuality and security pass, one-word recommendation. Read-only: never posts, never votes."
---

> Recommended agent: `iFacto.CodeReviewer`

# Code review

Run the **iFacto.CodeReviewer** agent.

- No arguments: **local mode** - review the current branch against its target branch plus
  uncommitted changes.
- `<org> <pr-id>` or a PR URL (orgs: `iFactoApps`, `iFactoCustomers`): **pr mode** - review that
  Azure DevOps PR; the validation build must be green first.

The report follows the `iFacto.code-review` skill: context line, overview, requirement (Jira
description and comment thread), ranked findings each tied to a rule id / BCQuality article /
security category or marked `opinion`, notes, suppressed-by-exception, rules checked, and one
word: `approve` / `fix` / `block` / `split`.

Nothing is posted to DevOps and nothing is voted. To fix the findings, say **fix them**: when
the workspace can run SDD (sandbox in `launch.json`, no QA configuration, a test app, findings
that change behaviour) the agent tells you to run `/iFacto.SDD` with the findings; otherwise it
hands off to `iFacto.ALCoder` and says which check ruled SDD out.
