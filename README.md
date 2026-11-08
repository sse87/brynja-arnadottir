# Brynja Árnadóttir — bilingual legacy archive

Next.js (App Router) site. The engineering spec and build phases live in [`docs/SPEC.md`](docs/SPEC.md).

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm dev
```

Quality gate for every phase: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
