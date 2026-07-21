# System Context — Restaurants OS (C4 Level 1)

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the C4 Level 1 system context — what Restaurants OS is and who/what interacts with it |
| **Scope**          | System boundary and all external actors |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | External systems are integrated via APIs or events; not owned by Restaurants OS |
| **Constraints**    | Diagram is text-based (Mermaid); no image-only diagrams |
| **Risks**          | External system boundaries not clearly agreed; leads to unclear ownership |
| **References**     | C4 Model (Simon Brown), [Container View](05-container-view.md) |
| **Related Documents** | [Architecture Drivers](03-architecture-drivers.md), [Integration Patterns](../05-api/INTEGRATION_PATTERNS.md) |

---

## System Context Diagram

```mermaid
graph TB
    subgraph Users
        WA[Waiter / Floor Staff]
        KS[Kitchen Staff]
        MG[Manager / Owner]
        FR[Franchise Administrator]
        GA[Guest]
    end

    subgraph External Systems
        PG[Payment Gateway<br/>Stripe / Adyen]
        DL[Delivery Platform<br/>Uber Eats / Deliveroo]
        ID[Identity Provider<br/>Keycloak / Azure AD B2C]
        AC[Accounting Export<br/>QuickBooks / Xero]
        PY[Payroll System<br/>ADP / Workday]
        NT[Notification Service<br/>SendGrid / Twilio]
    end

    ROS[Restaurants OS<br/>Enterprise Restaurant Operating System]

    WA -->|Places and manages orders| ROS
    KS -->|Views and manages production| ROS
    MG -->|Manages operations and views reports| ROS
    FR -->|Manages franchise compliance and financials| ROS
    GA -->|Makes reservations, views loyalty| ROS

    ROS -->|Processes payments| PG
    ROS -->|Receives delivery orders| DL
    ROS -->|Authenticates users| ID
    ROS -->|Exports financial data| AC
    ROS -->|Exports timesheets| PY
    ROS -->|Sends notifications| NT
```

---

## External Actor Descriptions

| Actor | Type | Interaction |
|---|---|---|
| Waiter / Floor Staff | Human | Order entry, table management, payment |
| Kitchen Staff | Human | Production tracking via KDS |
| Manager / Owner | Human | Reporting, configuration, financial oversight |
| Franchise Administrator | Human | Franchise management, brand compliance, royalties |
| Guest | Human | Reservations, loyalty (via web/app — future) |
| Payment Gateway | External System | Payment authorization and settlement |
| Delivery Platform | External System | Receives and sends delivery orders |
| Identity Provider | External System | User authentication (OIDC/OAuth2) |
| Accounting Export | External System | Financial data export for external accounting tools |
| Payroll System | External System | Staff timesheet and payroll data export |
| Notification Service | External System | Email, SMS, push notification delivery |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial system context diagram |
