# Plugin Platform — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the Plugin Platform architecture — extension points, plugin lifecycle, versioning, and isolation |
| **Scope**          | All plugin extension mechanisms in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Plugins are first-party or certified third-party extensions; not arbitrary code |
| **Constraints**    | Plugins cannot modify core domain logic; they extend it via defined extension points |
| **Risks**          | Malicious plugins; plugins breaking core stability; plugin version conflicts |
| **References**     | [Architecture Principles — Principle: Plugin Architecture](../02-architecture/00-architecture-principles.md) |
| **Related Documents** | [PLATFORM_SERVICES](PLATFORM_SERVICES.md), [CONFIGURATION_PLATFORM](CONFIGURATION_PLATFORM.md) |

---

## Plugin Design Goals

1. **Core stability**: A plugin cannot break core functionality
2. **Tenant isolation**: Plugins are installed and scoped per tenant
3. **Versioning**: Plugins have explicit versions; breaking changes require new major version
4. **Discovery**: Plugins are discoverable via a plugin registry
5. **Sandboxing**: Plugin execution is isolated from core process resources

---

## Extension Points

| Extension Point | Description | Example Use Case |
|---|---|---|
| `OrderCreated` hook | Called when an order is created | Loyalty points calculation |
| `MenuPricing` override | Override price for specific items | Dynamic pricing plugin |
| `KitchenRouting` override | Custom station routing logic | Multi-kitchen orchestration |
| `ReportDefinition` | Register custom report templates | Franchise-specific reports |
| `NotificationTemplate` | Override notification content | Branded notification templates |
| `PaymentMethod` | Register a custom payment method | Gift card, house account |

---

## Plugin Lifecycle

```
Register → Review → Approved → Install (per tenant) → Active → Deactivate → Uninstall
```

| State | Description |
|---|---|
| Register | Plugin author submits plugin manifest |
| Review | Platform team reviews for security and compatibility |
| Approved | Plugin available in registry |
| Install | Tenant installs plugin; version pinned |
| Active | Plugin is processing events/hooks |
| Deactivate | Plugin disabled without removal |
| Uninstall | Plugin fully removed from tenant |

---

## Plugin Manifest

Every plugin must provide:

```yaml
# plugin.yaml
name: acme-loyalty-plugin
version: 1.2.0
author: Acme Corp
license: Commercial
extensionPoints:
  - OrderCreated
  - MenuPricing
minPlatformVersion: 1.0.0
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial plugin platform design |
