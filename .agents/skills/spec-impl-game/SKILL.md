---
name: spec-impl-game
description: Implements an approved game spec exactly like /spec-impl (same validation, branch and step-by-step rhythm) and, once the implementation is finished, runs the skin-designer agent and then the mobile-porter agent, one after the other (never in parallel).
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run lint:*), Bash(npm run build:*)
---

# /spec-impl-game — Spec implementer for games + skins + mobile controls

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

The received argument is: `$ARGUMENTS`

This command is `/spec-impl` plus a closing chain of two agents. Follow the three phases in strict order. **Do not advance to the next phase if the previous one did not complete correctly.**

---

### Phase A — Implement the spec (same as /spec-impl)

`/spec-impl` cannot be invoked through the Skill tool (`disable-model-invocation`), so **read `.agents/skills/spec-impl/SKILL.md` and follow its four phases exactly as written**, using `$ARGUMENTS` as the spec name:

1. Identify the spec.
2. Validate that its state means "Approved" (otherwise show the standard error and **stop**: no branch, no code, no agents).
3. Check the working tree, create/switch to the `spec-NN-slug` branch (respecting `AutoCreateBranch`) and show the spec summary.
4. Implement step by step, pausing after each step, never committing, never improvising.

All its rules (ambiguities, out-of-scope requests, no automatic commits) apply unchanged. Read the file again if you are unsure; do not rely on memory. For game specs, also follow `/add-game` conventions where the spec points to them.

Move to Phase B **only** when `/spec-impl` reaches its final message (`✅ All steps of the plan are implemented.`). If the user stops, pauses or abandons the implementation before that, do not launch any agent.

---

### Phase B — Identify the game slug

The two agents receive the game's slug (the `games.id`, e.g. `serpentina`, `caida`). Get it from the spec (and from the files it created under `lib/games/` and `GAME_ENGINES`). If the spec defines no game or the slug is ambiguous, ask the user which slug to use before continuing.

Tell the user:

```
Implementation finished. Now I will run, one after the other:
  1. skin-designer  → <slug>
  2. mobile-porter  → <slug>
```

---

### Phase C — Run the agents in sequence

**Never in parallel.** Each `Agent` call goes alone in its own message, in the foreground, and you wait for its result before doing anything else.

1. Call `Agent` with `subagent_type: "skin-designer"` and a prompt such as: `Slug: <slug>. The game was just implemented from specs/NN-slug.md. Make sure it has the 3 skins (clasico, neon, retro) and leave the report in specs/skins/<slug>.md.` Wait for it to finish and summarize its result (files touched, lint/build outcome, report path).
2. Only after the first agent has finished, call `Agent` with `subagent_type: "mobile-porter"` and a prompt such as: `Slug: <slug>. The game was just implemented from specs/NN-slug.md (and may have just received skins). Check keyboard/mouse and virtual-gamepad controls per SPEC 10 and leave the report in specs/mobile/<slug>.md.` Wait for it and summarize its result.

If the first agent fails or reports unresolved errors (lint/build), **stop**: tell the user and ask whether to continue with `mobile-porter`. Do not launch it on your own.

---

### Closing

```
✅ spec-impl-game finished.

Spec:    specs/NN-slug.md
Branch:  spec-NN-slug
Skins:   specs/skins/<slug>.md
Mobile:  specs/mobile/<slug>.md

Next step: review the diff, verify the spec's acceptance criteria one by one and,
if they all pass, update the spec's state to "Implemented" and make the final
commit before merging. I have not committed anything.
```
