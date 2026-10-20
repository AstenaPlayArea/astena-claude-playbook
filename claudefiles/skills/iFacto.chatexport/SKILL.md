---
name: iFacto.chatexport
description: 'Export a Claude Code chat session to markdown — prompts, reasoning, tool calls, MCP usage, skills and sub-agents — as analysis material for improving the iFacto dev workflow. Use when: "export this chat", "export the chat from yesterday", "capture this conversation", "analyse what went wrong in this session", "which sessions do I have". The script does the work; never transcribe a chat by hand.'
---

# iFacto.chatexport — the chat as workflow evidence

When a developer hits friction — an agent that looped, a skill that never triggered, an MCP
server that was connected but ignored, a tool that kept failing — the evidence is in the
session transcript. This skill turns that transcript into artifacts we can analyse to
improve our skills, agents and MCP setup.

An export is **internal analysis material**, not a deliverable.

## Procedure

### 1. Pick the session

If the developer said "this chat" or "the current session", use `latest`. Otherwise list
first and choose explicitly:

```bash
node ~/.claude/skills/iFacto.chatexport/scripts/export-chat.mjs --list --limit 15
```

Present the list (date, title, turn count) and let the developer choose. If they said
something like "the one about the pipeline yesterday", pick it yourself from the list and
**state your choice before exporting**.

### 2. Export

One command does everything:

```bash
node ~/.claude/skills/iFacto.chatexport/scripts/export-chat.mjs <session|latest|@N>
```

Under GitHub Copilot the skill lives at `~/.copilot/skills/iFacto.chatexport/` — use that
path instead. Always invoke it with `node`; the file is not executable.

It writes everything to the system **Downloads** folder (`~/Downloads` on macOS and Windows
alike) — three markdown files plus a zip of them — and prints a JSON summary to stdout:

| File | What it is |
|---|---|
| `<date>-<slug>-diagnose.md` | **Start here.** Compact workflow analysis — capabilities available vs. used, friction signals, turn timeline. Small enough to read whole. |
| `<date>-<slug>-conversation.md` | The dialogue only, one line per answer about the tools that ran. The reading version. |
| `<date>-<slug>-full.md` | Everything: reasoning, tool inputs and results, decision points, sub-agent appendix. |

The zip is what you send: `<date>-<slug>-chatexport.zip`, roughly 4x smaller. The three
markdown files sit beside it for reading.

**Nothing is ever written into the repository.** Exports carry customer code and command
output, so keeping them out of every working tree means no `.gitignore` entry is needed and
nothing can be committed by accident. `--out <dir>` overrides the destination if you really
want them elsewhere.

Useful flags: `--no-zip` · `--zip-dir <dir>` · `--mode diagnose|conversation|full|all` · `--out <dir>` ·
`--project <path>` (sessions of another workspace) · `--sanitize` (also redact e-mail
addresses) · `--thinking details|inline|none` · `--subagents report|full|none` ·
`--max-result <n>` (default 4000 characters) · `--slug <s>` · `--title "<t>"`.

### 3. Report back

Read the **JSON summary**, never the exported files. Report:

- title, period, turns, tool calls, sub-agents;
- friction: errors, interruptions, retry loops;
- `skillsUnused` and `mcpUnused` — the point of the exercise;
- **the zip path from the `zip` field of the summary, in full** — that is the one the
  developer attaches. Everything lives in Downloads, outside the workspace, so always give
  absolute paths rather than workspace-relative links;
- the three markdown file paths, for reading.

Say explicitly when `thinkingWithText` is `0`: the session stored only encrypted thinking
signatures, so the reasoning is not in the transcript. That is a property of the session,
not a failure of the export.

If the export is going to a devlead for workflow analysis, **send the zip** — all three
files travel together in it. Name the diagnose report as the one to open first, but do not
make the devlead ask for the rest.

## Hard rules

- **Never transcribe by hand.** The script reads the transcript; you read the JSON summary.
  Retelling a chat in markdown burns a fortune in tokens and produces an unreliable record.
- **Never let an export reach a customer.** They contain full file contents, command output
  and customer AL code. Internal material only. (They land in Downloads, never in a repo,
  so there is nothing to keep out of git.)
- **Always reply with the exact file locations as clickable links.** The developer must be
  able to open the export in one click.
- **Secrets are redacted automatically** (tokens, passwords, connection strings, URL
  credentials, SAS tokens, `Authorization` headers). If you still spot something sensitive
  in the summary, re-export with `--sanitize` and delete the first files **before** sharing.
- **Only Claude Code sessions** from `~/.claude/projects/`. Other chat sources are out of
  scope — for presenting a chat to an audience, use the `chat-replayer` skill instead.

## What the diagnose report answers

This is the file an analysing agent should read first.

| Section | Question it answers |
|---|---|
| Session | Which model, version, workspace and branch was this? |
| Capabilities: available vs. used | **Which iFacto skills were offered but never triggered?** Which MCP servers were connected but never called? |
| Friction signals | How many tool errors, interruptions, retry loops and clarifying questions? |
| Turn timeline | Where did time go? Which turn ballooned or was interrupted? |
| Tool usage | What did the agent actually lean on? |
| Sub-agents | What was delegated, and how much work did it do? |
| Tokens | Output, cumulative context and cache reads. |

A skill listed under "offered but never invoked" is the strongest signal we have that its
`description` does not match how developers actually phrase the request.

## Limits

- Exporting the **current** session cannot include the turns that happen after the export
  runs — the transcript is still being written.
- Sub-agent detail comes from the `subagents/` sidecar files. Older sessions may not have
  them; the export then shows only the `Agent` call and its returned result.
- Tool inputs and results are truncated (6000 / 4000 characters) with the real total marked.
  Raise `--max-input` / `--max-result` when you need more.
