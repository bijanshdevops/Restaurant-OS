# ADR-0004: Multi-Tenant Data Isolation Strategy

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish how tenant data is isolated in all storage layers |
| **Scope**          | All data storage across the platform |
| **Status**         | Draft |
| **Owner**          | Principal Architect + Security Architect |
| **Assumptions**    | Multi-tenant SaaS deployment model; tenants share infrastructure but must never see each other's data |
| **Constraints**    | Isolation must be structural — not solely reliant on WHERE clause filtering |
| **Risks**          | Cross-tenant data leakage via query bugs; shared-schema performance contention |
| **References**     | [Storage Platform](../../docs/04-platform/STORAGE_PLATFORM.md), [ThreatModel](../../docs/03-security/ThreatModel.md) |
| **Related Documents** | [Authorization](../../docs/03-security/Authorization.md) |

---

## Context

Restaurants OS supports multiple tenants (restaurant groups) on shared infrastructure. Tenant data must never be accessible by another tenant, even in the event of application bugs, misconfiguration, or partial authorization failure.

Three isolation strategies are available: separate database per tenant, shared database with schema-per-tenant, and shared schema with row-level isolation.

---

## Decision

> **We will use row-level tenant isolation (tenant_id column) enforced at the repository layer, with structural validation in CI/CD.**

**Rationale**:
- Schema-per-tenant creates operational complexity at scale (1000s of schemas)
- Database-per-tenant is cost-prohibitive for small tenants
- Row-level isolation with enforced repository-layer filtering provides adequate isolation at this scale

**Enforcement**:
- All repository implementations must receive `TenantId` as a constructor dependency
- All queries must include `WHERE tenant_id = @tenantId`
- Fitness function FF-013 scans for repository implementations missing tenant filter

**Phase 3+**: Evaluate schema-per-tenant for financial data (Accounting Context) to meet regulatory isolation requirements — requires separate ADR.

---

## Consequences

### Positive
- Simpler operational model (shared schema)
- Lower cost at scale
- Repository-layer enforcement is auditable

### Negative
- Application-level bug could theoretically bypass filter (mitigated by FF-013)
- Performance contention at very high tenant counts (thousands)

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 4: Multi-Tenant by Design |
| **Quality Attribute** | QAS-SEC-001: Tenant Isolation |
| **Fitness Functions** | FF-013 |
| **Related ADRs** | ADR-0002 |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
