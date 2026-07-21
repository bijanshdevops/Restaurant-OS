# Release Policy — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the release process, versioning scheme, and release gate requirements |
| **Scope**          | All production releases |
| **Status**         | Draft |
| **Owner**          | SRE Lead + Architecture Board |
| **Assumptions**    | Semantic versioning is used; releases are tagged in Git |
| **Constraints**    | No release to production without Architecture Board sign-off |
| **Risks**          | Hotfix bypassing governance; version scheme inconsistency |
| **References**     | [CI_CD](../docs/07-devops/CI_CD.md), [QUALITY_GATE](../docs/08-quality/QUALITY_GATE.md) |
| **Related Documents** | [VERSION_POLICY](VERSION_POLICY.md), [CHANGELOG](../CHANGELOG.md) |

---

## Versioning Scheme

Restaurants OS follows **Semantic Versioning 2.0.0** (SemVer):

```
{MAJOR}.{MINOR}.{PATCH}[-{PRE-RELEASE}]+{BUILD}

Examples:
  1.0.0           ← stable release
  1.1.0           ← new features, backward compatible
  1.1.1           ← bug fix
  2.0.0           ← breaking change
  1.1.0-rc.1      ← release candidate
  1.1.0-alpha.1   ← alpha
```

---

## Release Types

| Type | Cadence | Trigger | Gate Required |
|---|---|---|---|
| Feature Release | Monthly | Product planning | Gate 4 (Full) |
| Patch Release | As needed | Bug fix | Gate 3 minimum |
| Hotfix | Emergency | P1 incident | Principal Architect + SRE Lead |
| Release Candidate | Pre-release | Stabilization | Gate 3 |

---

## Release Gate Requirements

### Standard Release
- [ ] All CI/CD gates passed (Gates 1–3)
- [ ] Architecture Board sign-off (Gate 4)
- [ ] CHANGELOG updated
- [ ] Release notes prepared
- [ ] Rollback plan documented
- [ ] All ADRs for features in this release are Approved

### Hotfix Release
- [ ] Gates 1–2 passed
- [ ] Principal Architect + SRE Lead approval
- [ ] Post-release Architecture Board ratification within 24 hours
- [ ] CHANGELOG updated

---

## Post-Release Checklist

- [ ] Verify health checks pass in production
- [ ] Verify smoke tests pass
- [ ] Monitor error rate for 30 minutes post-deployment
- [ ] Notify stakeholders of release
- [ ] Update PROJECT_STATUS.md

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial release policy |
