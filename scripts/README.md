# Scripts — Restaurants OS

> This directory contains automation scripts for CI/CD, architecture validation, and repository maintenance.

---

## Purpose

Automation scripts to support the governance model, quality gates, and architecture fitness function enforcement.

---

## Scripts

| Script | Status | Description |
|---|---|---|
| `validate-docs.sh` | Planned | Validates documentation front-matter fields |
| `check-architecture.sh` | Planned | Runs architecture fitness functions |
| `generate-adr-index.sh` | Planned | Regenerates the ADR/RFC index tables |
| `check-event-conventions.sh` | Planned | Validates domain event naming against conventions |
| `check-secrets.sh` | Planned | Scans for hardcoded secrets (FF-010) |

---

## Script Standards

All scripts must:
- Include a `--help` flag with usage
- Exit with code 0 on success, non-zero on failure
- Be runnable on both Linux (CI) and macOS/Windows (developer)
- Include a README.md documenting inputs, outputs, and usage

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial scripts directory |
