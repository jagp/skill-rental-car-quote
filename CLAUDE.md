# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

This repository will hold a Claude Code skill that teaches Claude to efficiently use the
browser to search for low-cost car rentals. The skill implementation (SKILL.md, scripts,
references) has not been built yet — the repo currently contains only scaffolding
(README, git workflow notes, linting config). When adding the actual skill, follow the
Claude Code skill structure conventions (a `SKILL.md` with frontmatter `name`/`description`,
plus any supporting scripts/references) rather than inventing a different layout.

## Branching model

This repo uses git-flow (see `.development`):

- `main` — production-ready code
- `develop` — integration branch for the next release (current branch)

Start new work with `git flow feature start <name>` and finish with
`git flow feature finish <name>`. Don't commit feature work directly to `main` or `develop`.

## Linting

Linting is managed by [Trunk](https://docs.trunk.io/cli) (`.trunk/trunk.yaml`), with
markdownlint, prettier, git-diff-check, and trufflehog enabled. Run checks with:

```
trunk check
trunk fmt
```

Markdown formatting follows the Prettier-friendly markdownlint style
(`.trunk/configs/.markdownlint.yaml`), so don't hand-format Markdown against Prettier's output.
