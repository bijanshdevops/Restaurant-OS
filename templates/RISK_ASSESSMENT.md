# Risk Assessment Template — Restaurants OS

> Use this template when assessing risks for a new decision, RFC, or significant change.

---

# Risk Assessment: [Subject]

**Date**: YYYY-MM-DD  
**Author**: [Role]  
**Subject**: [What is being assessed]

---

## Risk Matrix

**Probability**: 1 (Rare) → 5 (Almost Certain)  
**Impact**: 1 (Negligible) → 5 (Catastrophic)  
**Score** = Probability × Impact

| Score | Level |
|---|---|
| 1–4 | Low |
| 5–9 | Medium |
| 10–14 | High |
| 15–25 | Critical |

---

## Risk Register

| ID | Risk | Probability | Impact | Score | Level | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-001 | [Risk description] | 1-5 | 1-5 | P×I | Low/Med/High/Crit | [Mitigation strategy] | [Role] |
| R-002 | | | | | | | |
| R-003 | | | | | | | |

---

## Residual Risk

After mitigations are applied, what is the residual risk level?

**Residual Risk Level**: [Low / Medium / High]  
**Acceptable?**: [Yes / No — if No, escalate to Architecture Board]

---

## Escalation

If any risk is Critical or residual risk is High or Critical:
- Escalate to Architecture Board before proceeding
- Record escalation in [decision-log/README.md](../decision-log/README.md)
