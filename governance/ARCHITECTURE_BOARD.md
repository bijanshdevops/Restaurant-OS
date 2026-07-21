# Architecture Board — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the Architecture Board charter — membership, mandate, quorum, and decision process |
| **Scope**          | All architecture decisions within Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Board is constituted before Phase 0 completes |
| **Constraints**    | Board must achieve quorum for binding decisions |
| **Risks**          | Board not constituted in time; board decisions not followed |
| **References**     | [DECISION_PROCESS](DECISION_PROCESS.md), [REPOSITORY_RULES](../REPOSITORY_RULES.md) |
| **Related Documents** | [CONTRIBUTING](../CONTRIBUTING.md) |

---

## Purpose

The Architecture Board is the governing body for all architectural decisions in Restaurants OS. It ensures that:

1. Architecture decisions are made deliberately and documented
2. Architecture principles are consistently applied
3. Technical debt is tracked and managed
4. The documentation and governance standard is enforced

---

## Membership

| Role | Membership Type | Vote |
|---|---|---|
| Principal Architect | Permanent | Yes |
| Security Architect | Permanent | Yes |
| SRE Lead | Permanent | Yes |
| Domain Architect (rotating) | Rotating (quarterly) | Yes |
| Product Owner | Permanent | Advisory only |
| Senior Developer (rotating) | Rotating (quarterly) | Advisory only |

---

## Quorum and Voting

- **Quorum**: 3 voting members must be present
- **Standard decisions**: Simple majority of voting members present
- **Breaking standard changes**: Unanimous vote of all permanent members
- **Emergency decisions**: Principal Architect + 1 other member; ratified by full board within 48 hours

---

## Board Responsibilities

1. Review and approve/reject all ADRs
2. Review and close all RFCs
3. Enforce REPOSITORY_RULES.md
4. Conduct quarterly architecture reviews
5. Manage architecture fitness function compliance reports
6. Approve changes to architecture principles and standards

---

## Meeting Cadence

- **Bi-weekly**: Standard Architecture Board meeting (ADR/RFC reviews)
- **Monthly**: Architecture health review (metrics, fitness functions)
- **Quarterly**: Architecture evolution review

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial board charter |
