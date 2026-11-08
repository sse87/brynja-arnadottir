# Project: {{artist}} legacy archive

The full engineering spec is `docs/SPEC.md`. It is the source of truth; read the relevant
section before working on any part of the site. If the spec and the actual framework/library
behaviour disagree (versions move), follow the installed library, then tell me what you
changed and update the spec.

- Package manager: pnpm. Never use npm or yarn.
- Build in the phases of Appendix C, one phase per request unless I say otherwise.
- A phase is done only when `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass.
- Commit at the end of each phase with a message like `feat(phase-2): i18n routing`.
- Don't touch `.env.local`, and never put secrets in code or committed files.
- Ask before adding any dependency that isn't listed in the spec.
