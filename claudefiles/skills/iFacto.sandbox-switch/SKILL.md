---
name: iFacto.sandbox-switch
description: 'Check the BC SaaS sandbox from launch.json for DEV extensions (published from VS Code) that do not belong to the current workspace — the app and test app of the previous customer left behind — and uninstall them only after the developer agrees. Use from iFacto.SDD Step 1.6 before the first publish, or when: "which dev extensions are in my sandbox", "clean my sandbox", "switch my sandbox to customer X", "welke dev extensies staan er nog", "a publish fails on object IDs another extension owns". DEV extensions only; PTEs and Global apps are never touched.'
---

# iFacto.sandbox-switch — only this workspace's DEV extensions in the sandbox

A developer's sandbox moves from customer to customer. The DEV extensions of the previous
customer stay installed: work on Van Houcke starts in `delbast-Tribu` while Tribu's app and
test app are still there, and overlapping object IDs make the publish fail. This skill finds
those leftovers and removes them — **only after the developer has said yes**.

**Always check.** Every sandbox is checked before the first publish to it — automatically
when there is a token, after a device-code sign-in (Step 1a) when there is none, by hand
(Step 1b) when that sign-in does not get one either. A sandbox that could not be read is never
skipped and never assumed clean, whatever tenant it is in.

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
| 1, `no-token` | No Business Central token for the sandbox's tenant; `error` says why | `signIn: true` → Step 1a, at once. `signIn: false` (no Azure CLI) → pass `error` on in one line, then Step 1b |
| 1, `error` | The sandbox could not be checked: 401/403, environment not found | ⛔ Step 4 |
| 2, `usage` | Wrong `--project`, no app.json, no Sandbox configuration | Fix the call; if launch.json itself is wrong, ⛔ Step 4 |

The comparison is on app **id** — never on name, publisher or count. A library developed
alongside is a dependency in `app.json` and is not foreign, and every iFacto app carries the
same publisher.

### 1a. Sign in — at once, when there is no token

`signIn: true` means az is installed but has no usable login for the sandbox's tenant. Do not
ask whether to sign in, and do not send the developer to a terminal for `az login`: start the
sign-in yourself, right away.

```bash
node ~/.claude/skills/iFacto.sandbox-switch/scripts/dev-apps.mjs login --project <App folder> --project <Test folder>
```

`login` runs a device-code sign-in (`az login --use-device-code`) to the launch.json tenant and
waits until the developer has signed in. az gives up after about 15 minutes. Start it in the
background (Claude Code: Bash with `run_in_background: true`). It prints one JSON object per
line:

1. **`device-code`**, within seconds. Read it from the background task's output (if it is not
   there yet, wait for it with Monitor and an until-loop). Hand it over in one short message:
   open `url`, enter `code`, sign in with `account`. When `account` is null, the developer signs
   in with the account they publish with from VS Code, which for the Oxygen Group NV tenant is
   not their iFacto account. The code is valid for about 15 minutes. When `code` is null, pass
   `message` on verbatim. Then wait: you are notified when the command ends. Do not poll, and
   do not start a second sign-in.
2. **The last line**, when the command ends:

| Exit, `status` | Do |
|---|---|
| 0, `signed-in` | Run Step 1 `check` again. It now gets a token |
| 1, `no-token` (`signIn: false`) | The sign-in did not complete: the code expired, the developer declined, or the account has no access. Pass `error` on in one line, then Step 1b. Start another sign-in only when the developer asks for a new code |

**The default az account.** `az login` makes the new login the default az account, and Azure
DevOps calls run as the default: the PR that `/iFacto.Pullrequest` creates with `az rest`, and
pipelines and reviews too. `login` therefore puts back the account that was the default
before, and `defaultAccount.status` reports `kept` or `restored`. On `not-restored`, tell the
developer in one line that DevOps calls run as the wrong account until they run
`defaultAccount.fix`. Never leave that message out.

### 1b. Check by hand — when there is still no token

Only when Step 1a did not get a token, or there is no Azure CLI. The developer reads the list in
Business Central; the script still compares on app id.

1. Give the developer the `extensionManagement` link from the report — Extension Management of
   that sandbox, filtered on **Published As = Dev** — and these steps:
   - check that the filter shows Published As = Dev (set it if the link did not);
   - select all rows;
   - **Develop in VS Code → Get selected as dependencies → Show and copy**;
   - copy the JSON from the dialog and paste it here. No rows at all → paste `[]`.

   This is input, not a decision: ask for it in plain text, not with `AskUserQuestion`.
2. Save the paste unchanged to a file in your scratchpad and compare it:

   ```bash
   node ~/.claude/skills/iFacto.sandbox-switch/scripts/dev-apps.mjs compare --project <App folder> --project <Test folder> --list <file>
   ```

   Same `clean` / `foreign` result as `check`, marked `"source": "pasted"`. Exit 2 means the
   paste is not the Show-and-copy JSON, or it holds Microsoft apps (the Dev filter was off):
   say what is wrong and ask again. The pasted list does not say which extensions are
   installed — an uninstalled DEV extension can come back as foreign; the **Is Installed**
   column in Extension Management shows it.
3. `foreign` → Step 2. Without a token, the developer does the uninstall in Extension
   Management (Step 3b).

**Never look for another way to a token.** Do not search token caches, credential stores or
the settings of VS Code, the AL extension, the AL CLI or any other tool, and do not reuse a
token another tool holds. The automatic routes are the developer's own `az` login (the one
`login` starts, or one they made themselves) and a `BC_ACCESS_TOKEN` the developer set.
Everything else is Step 1b.

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
| 1, `no-token` | Step 1a, then run uninstall again. Still no token → Step 3b |
| 1, `partial` / `error` | Report `failed[]` and `stillInstalled[]` with their errors, then stop. The developer removes them in Extension Management or decides to keep them. Never retry with `--delete-data` on your own |

### 3b. Uninstall by hand — when there is still no token

Tell the developer which apps to uninstall (name, app id) and how: in Extension Management,
select the app → **Uninstall**, test apps and other dependents first. For "delete data", run
**Delete Orphaned Extension Data** on the same page afterwards, for those apps only. Then
repeat Step 1b once to confirm the apps are gone. Until the developer confirms, do not publish.

### 4. Hard stop

Exit 1 with `status: "error"` from `check` — or a launch.json the script cannot use — stops the
workflow. Report the `error` text and what unblocks it: the `az login` command in it, or
extension-management permission in the sandbox (permission set `EXTEN. MGT. - ADMIN` or
`SUPER`). Do not ask whether to continue anyway, and
do not publish without the check — a hard stop is not a decision.

## Authentication

The token is the developer's own, from the Azure CLI. The dev sandboxes live in a tenant
(Oxygen Group NV) where developers publish with **another account than their iFacto account**
— the iFacto account is refused there (`AADSTS50020`). The script therefore asks az for a
token with every account that is signed in to the launch.json tenant (`--subscription <that
login>`), and with the active account only after those. When there is no such login, or it has
expired, the result is `no-token` and `login` signs in with a device code (Step 1a). That
login holds until it expires. A developer can do the same in a terminal:

```bash
az login --tenant <tenant from launch.json> --allow-no-subscriptions
```

signed in with the account they publish with from VS Code. That switches the default az
account, which Azure DevOps calls use; `az account set --subscription <name>` puts it back.
`login` does that by itself. `BC_ACCESS_TOKEN` in the environment overrides the Azure CLI. No
app registration and no admin role — the Automation API acts with the rights the developer
already has in the sandbox.

The Admin Center API is deliberately not used: it needs the Entra role *Dynamics 365 Business
Central Administrator*, which applies to every environment in the tenant, production included.

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
