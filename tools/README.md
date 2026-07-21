# Tools — Restaurants OS

> This directory contains architecture and documentation tooling used by the Architecture team.

---

## Purpose

Custom tools for architecture governance, fitness function validation, documentation quality checking, and decision process support.

---

## Tools

| Tool | Status | Description |
|---|---|---|
| `fitness-functions/` | Planned | Automated architecture fitness function scripts |
| `doc-quality-check/` | Planned | CI script to validate documentation front-matter |
| `event-schema-validator/` | Planned | Validates domain events against registered schemas |
| `adr-index-generator/` | Planned | Generates ADR index table from adr/ directory |
| `dependency-check/` | Planned | Checks module dependencies against architecture rules |

---

## Adding Tools

1. Create a subdirectory under `tools/`
2. Include a `README.md` with purpose, usage, and requirements
3. Tools must be runnable in CI and locally
4. Submit a PR with Architecture Board approval

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial tools directory |
