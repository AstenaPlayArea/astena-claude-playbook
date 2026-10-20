---
description: "Export a Claude Code chat session to markdown (diagnose + conversation + full) as analysis material for improving the iFacto dev workflow."
---

# Export this chat

Follow the **`iFacto.chatexport`** skill.

1. Pick the session — `latest` for the current chat. Otherwise run the script with
   `--list --limit 15`, print that list in full, then ask with `AskUserQuestion` offering the 3
   most likely sessions (label: date + first prompt, trimmed) and let "Other" take a session id
   pasted from the list. Never truncate the list itself to 3 — the list is the evidence, the
   options are only the shortcut.
2. Export it:
   `node ~/.claude/skills/iFacto.chatexport/scripts/export-chat.mjs <session|latest|@N>`
3. Report back from the JSON summary: turns, tool calls, sub-agents, errors, interruptions,
   and above all `skillsUnused` / `mcpUnused`.
4. Give the **exact file paths as clickable links**, and check that `chat-exports/` is
   git-ignored. Never commit an export; never send one to a customer.

Do not transcribe the conversation by hand — the script does that work.
