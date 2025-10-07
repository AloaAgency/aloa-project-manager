# Agent Coordination Guidelines

This document applies to every automation agent (Claude, ChatGPT, custom scripts, etc.) working on the Aloa Web Design Project Manager repo.

## Security Documentation Protocol
- Treat `docs/SECURITY_FIX_PLAN.md` as the single source of truth for security tasks, mitigations, and status updates.
- When you complete, plan, or discover a security-related change (RLS, auth, OTP, cookie hardening, etc.), append the details to the relevant section in `docs/SECURITY_FIX_PLAN.md` instead of creating a new standalone file.
- If you need to draft supporting notes, place them under `docs/security/` as temporary scratch files and merge the important details back into the master plan before finishing the task.

## Documentation Organization
- All non-README documentation belongs in `docs/`. Do not create new Markdown files in the repository root.
- Before adding a new document, check whether an existing doc in `docs/` already covers the topic; extend it instead of fragmenting instructions.

## Pull Request & Branching Reminders
- Follow the branching conventions outlined in `CLAUDE.md` (daily branch format, no unsolicited merges).
- Announce significant security updates in your PR description with a link to the section updated in `docs/SECURITY_FIX_PLAN.md`.

Keeping the security plan centralized ensures every agent can pick up where the last one left off without missing critical context.
