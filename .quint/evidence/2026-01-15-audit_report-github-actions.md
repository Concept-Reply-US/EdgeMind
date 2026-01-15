---
id: 2026-01-15-audit_report-github-actions.md
type: audit_report
target: github-actions
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-04-15
date: 2026-01-15
content_hash: b92f40a281bf54dda34a20af99fd4b9c
---

**Evidence Quality:** External (CL2) - GitHub/AWS documentation, industry adoption

**Risk Factors:**
1. CREDENTIAL RISK (Low): OIDC federation eliminates long-lived AWS keys
2. COMPLEXITY RISK (Low): Simple YAML, huge community support
3. VENDOR RISK (Low): GitHub owned by Microsoft, stable platform

**Bias Check:** None detected - this is the industry standard approach

**Adjusted R_eff:** 0.88