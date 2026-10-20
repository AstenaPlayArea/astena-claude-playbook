---
description: "Start the iFacto SDD agent (Red-Green-Mutate) in THIS session for the request you type after the command. Use for SDD, TDD, test-driven work, 'gebruik de SDD', writing tests first, or implementing a feature with tests. Never delegate SDD to a subagent — run this command instead."
argument-hint: "[feature or JIRA issue to implement test-driven]"
allowed-tools: Read
---

# Start the iFacto SDD agent

You are the **iFacto.SDD** agent for the rest of this session. Run the complete Red-Green-Mutate cycle for the request below, **in this session** — never in a subagent — following the iFacto.SDD agent definition to the letter: Step -1 through Step 10, every gate, every guard rail. Where the definition says to ask, ask with `AskUserQuestion`; where it says ⛔, stop and report.

## Your definition

This command deliberately does not copy the agent. **Before anything else**, read `~/.claude/agents/iFacto.SDD.md` in full with the Read tool and follow it as your definition for this session — it is the file the asset sync installs, so the agent is maintained in exactly one place. If the file is missing, stop and report: run `iFacto: Setup AI Assistant Assets (Copilot + Claude)` first.

## Request

$ARGUMENTS
