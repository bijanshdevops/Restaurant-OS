# Subdomains — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Catalog all supporting and generic subdomains in the Restaurants OS domain |
| **Scope**          | All non-core domain areas |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Classification is reviewed per phase as the domain matures |
| **Constraints**    | Supporting domains may be built or purchased; Generic should be purchased |
| **Risks**          | Over-investing in generic subdomains; under-investing in supporting domains that become strategic |
| **References**     | [Core Domains](01-core-domains.md), [Domain Landscape](00-domain-landscape.md) |
| **Related Documents** | [Business Capability Map](../00-product/06-business-capability-map.md) |

---

## Supporting Subdomains

These are necessary for the system to function but do not provide competitive advantage. They can be built or purchased.

| Subdomain | Description | Buy / Build |
|---|---|---|
| Inventory Management | Ingredient tracking, stock counts, waste | Build (deep integration needed) |
| Staff Scheduling | Shift planning, availability, attendance | Build (branch-aware complexity) |
| Guest Profiles | Customer data, preferences, history | Build (loyalty integration) |
| Loyalty & Rewards | Points, tiers, redemption | Build (franchise-aware) |
| Reporting | Operational and management reports | Build (domain-specific data) |
| Procurement | Purchase orders, supplier management | Build (integration with inventory) |
| Reservations | Booking management, waitlist | Build (table context integration) |

## Generic Subdomains

These are commodity capabilities. Use proven third-party solutions.

| Subdomain | Description | Approach |
|---|---|---|
| Email / Notifications | Transactional messaging | Integrate (SendGrid, SMTP, etc.) |
| Payment Processing | Card, digital wallet processing | Integrate (Stripe, Adyen, etc.) |
| Delivery Logistics | Delivery partner integration | Integrate (Uber Eats, Deliveroo APIs) |
| Payroll | Staff payroll processing | Integrate (ADP, Workday, etc.) |
| Marketing Campaigns | Email/SMS campaigns | Integrate (Mailchimp, Klaviyo, etc.) |
| Authentication | User identity provider | Integrate (Keycloak, Auth0, Azure AD B2C) |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial subdomain catalog |
