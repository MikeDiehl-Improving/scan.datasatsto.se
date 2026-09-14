---
name: onboard-treegress
description: Onboard the Treegress MCP server (deterministic test-verification workflow) into the current project — builds treegress-agents-local from source, registers the MCP server against this project's root, creates/confirms .treegress/config.json, and wires the Treegress workflow into CLAUDE.md. Use when a project needs Treegress set up, when mcp__treegress__* tools are missing or disconnected, or when asked to "onboard treegress" / "set up treegress" for a project.
---

**Step 1 — resolve `$TREEGRESS_HOME`** (the `treegress-agents-local` source
checkout — it is not published anywhere, so this varies by machine). Try, in
order, stopping at the first that resolves:

1. The `TREEGRESS_HOME` environment variable, if set and
   `$TREEGRESS_HOME/setup-instructions/setup.md` exists.
2. A directory named `treegress-agents-local` alongside this project's root
   or one level above it (e.g. `../treegress-agents-local`,
   `../../treegress-agents-local` relative to the current project root) that
   contains `setup-instructions/setup.md`.
3. If neither resolves, ask the user where their `treegress-agents-local`
   checkout lives. Once they tell you, suggest they set it persistently so
   this skill doesn't have to ask again next time:
   - macOS/Linux (add to shell profile): `export TREEGRESS_HOME=/path/to/it`
   - Windows PowerShell: `[Environment]::SetEnvironmentVariable("TREEGRESS_HOME", "C:/path/to/it", "User")` (needs a new shell to take effect)

**Step 2 — read and execute, in full,** `$TREEGRESS_HOME/setup-instructions/setup.md`
against the current project as `$TARGET_ROOT` (default to `$(pwd)` unless the
user names a different project root).

That file is the single source of truth for this onboarding — every
prerequisite check, step, success criterion, and the credential-handling
rule (never ask for the `GEMINI_API_KEY` value) live there, not here. Do not
paraphrase or duplicate its instructions in this file; if the two ever
disagree, the setup.md file wins — go fix it there rather than overriding it
here.
