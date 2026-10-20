---
name: iFacto.sandbox-switch
description: 'Check the BC SaaS sandbox from launch.json for DEV extensions (published from VS Code) that do not belong to the current workspace — the app and test app of the previous customer left behind — and uninstall them only after the developer agrees. Use from iFacto.SDD Step 1.6 before the first publish, or when: "which dev extensions are in my sandbox", "clean my sandbox", "switch my sandbox to customer X", "welke dev extensies staan er nog", "a publish fails on object IDs another extension owns". DEV extensions only; PTEs and Global apps are never touched.'
---

# iFacto.sandbox-switch — only this workspace's DEV extensions in the sandbox

A developer's partner sandbox moves from customer to customer. The DEV extensions of the
previous customer stay installed: work on Polet starts in a sandbox that still holds AdRem's
app and test app, and overlapping object IDs make the publish fail. This skill finds those
leftovers and removes them — **only after the developer has said yes**.

This first slice handles DEV extensions only. PTEs and Global apps (AppSource) are read but
never reported and never touched.

## Procedure

### 1. Check

```bash
node ~/.claude/skills/iFacto.sandbox-switch/scripts/dev-apps.mjs check --project <App folder> --project <Test folder>
```

Pass every AL project of the workspace — each folder that holds an `app.json` (`App/` and
`Test/` in the usual iFacto layout). Always invoke it with `node`; the file is not executable.
The script reads the first `"environmentType": "Sandbox"` configuration from
`.vscode/launch.json` (in a project folder or the workspace root above it; `--launch <file>`
overrides), gets a token for the launch.json `tenant`, and prints one JSON document.

| Exit, `status` | Meaning | Do |
|---|---|---|
| 0, `clean` | Every installed DEV extension is a workspace app or one of its dependencies | Say so in one line and continue |
| 0, `foreign` | `foreign[]` lists DEV extensions that belong to something else | Step 2 |
| 0, `skipped` | The sandbox is in a customer tenant the developer reaches as a delegated admin (GDAP, `AADSTS50020`): VS Code publishes there with the AL extension's own app, the Azure CLI gets no token. A customer's own tenant holds no other customer's leftovers | Say so in one line (`reason`) and continue |
| 1, `error` | The sandbox could not be checked: no token, 401/403, environment not found | ⛔ Step 4 |
| 2, `usage` | Wrong `--project`, no app.json, no Sandbox configuration | Fix the call; if launch.json itself is wrong, ⛔ Step 4 |

The comparison is on app **id** — never on name, publisher or count. A library developed
alongside is a dependency in `app.json` and is not foreign, and every iFacto app carries the
same publisher.

### 2. Ask — always

Never uninstall without the developer's answer, also not when the answer looks obvious and
also not when the same apps were removed in an earlier session. Ask with `AskUserQuestion`:
one question, the foreign apps listed in the question text (name, version, app id), header
`DEV apps`:

- **Uninstall, keep data (Recommended)** — reversible: whoever works on that customer again
  republishes from VS Code and the data is back.
- **Uninstall and delete data** — irreversible: the tables those extensions own are dropped.
  Only needed when retained schema still blocks the publish.
- **Leave them** — the cycle continues with them installed. If object IDs overlap, the publish
  then fails, and that failure is a hard stop.

### 3. Uninstall

```bash
node ~/.claude/skills/iFacto.sandbox-switch/scripts/dev-apps.mjs uninstall --project <App folder> --project <Test folder> --ids <appId>,<appId> [--delete-data]
```

Pass exactly the `foreign[]` ids the developer agreed to; add `--delete-data` only for the
second answer. The script refuses any id that belongs to the workspace or is not an installed
DEV extension (exit 2, nothing uninstalled), retries in dependency order — an app another
target depends on goes after its dependent — and lists the sandbox again to confirm.

| Exit, `status` | Do |
|---|---|
| 0, `uninstalled` | Report what was removed in one line and continue |
| 1, `partial` / `error` | Report `failed[]` and `stillInstalled[]` with their errors, then stop. The developer removes them in Extension Management or decides to keep them. Never retry with `--delete-data` on your own |

### 4. Hard stop

Exit 1 from `check` — or a launch.json the script cannot use — stops the workflow. Report the
`error` text and what unblocks it: `az login --tenant <tenant>`, the Azure CLI install
(`winget install Microsoft.AzureCLI`), or extension-management permission in the sandbox
(permission set `EXTEN. MGT. - ADMIN` or `SUPER`). Do not ask whether to continue anyway, and
do not publish without the check — a hard stop is not a decision.

## Authentication

The token is the developer's own: `az account get-access-token --resource
https://api.businesscentral.dynamics.com --tenant <tenant>`. No app registration and no admin
role — the Automation API acts with the rights the developer already has in the sandbox.
`BC_ACCESS_TOKEN` in the environment overrides the Azure CLI.

The Admin Center API is deliberately not used: it needs the Entra role *Dynamics 365 Business
Central Administrator*, which applies to every environment in the tenant, production included.

The check is meant for **partner sandboxes in the developer's own tenant**. In a customer tenant
reached through GDAP the account is neither member nor guest, so the Azure CLI gets no token
there — that is `skipped`, not `error`. Do not ask the developer to get a guest account for it.

## Limits

- **DEV extensions only.** A PTE or Global app of another customer is out of scope here.
- **`publishedAs`** is a documented property whose values are not; the script accepts `Dev` in
  any case, padded or not. If `check` reports `clean` while Extension Management shows foreign
  DEV extensions, report it to the developer — do not work around it.
- **Uninstall** goes through the Automation API actions `Microsoft.NAV.uninstall` and
  `Microsoft.NAV.uninstallAndDeleteExtensionData`. If the sandbox rejects them for a DEV
  extension, report the error; never fall back to another API or to deleting data.
- **Unpublish** is not needed and not done: an uninstalled DEV extension stays listed in
  Extension Management, which is what makes "keep data" reversible.
