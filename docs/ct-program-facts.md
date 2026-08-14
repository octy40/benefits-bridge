# Connecticut Program Facts — Verified Against Primary Sources

**Research date:** 2026-08-14
**Scope:** FY2026 / tax year 2025 figures for the programs BenefitBridge screens against, plus the "keychain" discounts.
**Rule applied:** every number below traces to the agency that owns it (CT DSS, CT OPM, CT DRS, CT OEC, USDA FNS, IRS, HHS/ASPE, FCC/USAC, PURA/Eversource). Secondary write-ups, news articles, and aggregators were not used. Anything not confirmable from a primary source is marked **UNVERIFIED**.

---

## 0 · Foundation numbers (used to derive everything else)

### 2026 HHS Poverty Guidelines — 48 contiguous states + DC

Effective **January 13, 2026**; published Federal Register 91 FR, doc. 2026-00755, Jan 15 2026.

| Household size | Annual | Monthly (derived) |
| --- | --- | --- |
| 1 | $15,960 | $1,330 |
| 2 | $21,640 | $1,803 |
| 3 | $27,320 | $2,277 |
| 4 | $33,000 | $2,750 |
| 5 | $38,680 | $3,223 |
| 6 | $44,360 | $3,697 |
| 7 | $50,040 | $4,170 |
| 8 | $55,720 | $4,643 |
| +1 | +$5,680 | +$473 |

Source: https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines · https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines

> Note: SNAP FY2026 figures (effective 10/1/2025) are built on the **2025** guidelines, not these. CT medical/cash program figures effective 3/1/2026 use the 2026 guidelines above. Do not mix them.

### 60% State Median Income (CT), FFY2026 and FFY2027

FFY2026 (used by CEAP 2025-26 season **and** Care 4 Kids from 10/1/2025):

| HH size | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Annual | $47,764 | $62,460 | $77,157 | $91,854 | $106,550 | $121,247 | $124,002 | $126,758 |

Source: https://portal.ct.gov/dss/-/media/dss/legislative-reports/2025/liheap-csbg-ssbg/ffy-2026-liheap-ceap-fact-sheet.pdf

FFY2027 (proposed, for the 2026-27 season starting Oct 1 2026):

| HH size | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Annual | $48,714 | $63,703 | $78,692 | $93,681 | $108,669 | $123,658 | $126,469 | $129,279 |

Source: https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/winter-heating-assistance/ffy-27-liheap-allocation-plan.pdf

---

## 1 · SNAP in Connecticut

**Key CT-specific fact: Connecticut uses broad-based categorical eligibility (BBCE) at 200% FPL.** The federal 130% FPL gross-income test does *not* gate CT applicants — 130% is only the *threshold at which a CT household must report an income change*. This roughly doubles who screens eligible in CT versus a generic national screener, and it is the single most important CT nuance for the eligibility engine.

### Income limits and maximum allotments — effective 10/1/2025 through 9/30/2026 (FY2026)

| HH size | CT gross income limit (200% FPL, BBCE) | Report-change threshold (130% FPL) | Net income limit (100% FPL) | Max monthly allotment |
| --- | --- | --- | --- | --- |
| 1 | $2,609 | $1,696 | $1,305 | $298 |
| 2 | $3,525 | $2,292 | $1,763 | $546 |
| 3 | $4,442 | $2,888 | $2,221 | $785 |
| 4 | $5,359 | $3,483 | $2,680 | $994 |
| 5 | $6,275 | $4,079 | $3,138 | $1,183 |
| 6 | $7,192 | $4,675 | $3,596 | $1,421 |
| 7 | $8,109 | $5,271 | $4,055 | $1,571 |
| 8 | $9,025 | $5,867 | $4,513 | $1,789 |
| each addl. | +$917 | +$596 | +$459 | +$218 |

Sources:
- CT gross/net/max, all columns and the 200% BBCE label: CT DSS Program Standards Chart, as of 7/1/2026, SNAP columns marked "eff. 10/1/2025" — https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/fact-sheets-and-issue-briefs/fact-sheets/dss-program-standards-chart-effective-070126.pdf
- CT SNAP eligibility page (same gross + max benefit figures, stated effective October 1, 2025) — https://portal.ct.gov/dss/snap/supplemental-nutrition-assistance-program---snap/eligibility
- Federal 130%/100% limits and max allotments: USDA FNS — https://www.fns.usda.gov/snap/recipient/eligibility

### Benefit formula

> "Multiply net income by 30% (round up) … Subtract 30% of net income from the maximum allotment for the household size."
> FNS worked example: $994 max allotment (HH4) − $314.25 (30% of $1,047.50 net) = **$679/month**.

Source: https://www.fns.usda.gov/snap/recipient/eligibility (Table 5)

### Deductions and allowances — FY2026

| Item | Amount | Source |
| --- | --- | --- |
| Earned income deduction | 20% of earned income | FNS eligibility page |
| Standard deduction, HH 1–3 | $209 | FNS + CT DSS chart |
| Standard deduction, HH 4 | $223 | CT DSS chart |
| Standard deduction, HH 5 | $261 | CT DSS chart |
| Standard deduction, HH 6+ | $299 | CT DSS chart |
| Excess shelter deduction cap (non-elderly/disabled) | $744 | FNS + CT DSS chart ("Max Shelter Hardship") |
| Homeless shelter deduction | $198.99 | FNS + CT DSS chart |
| CT Standard Utility Allowance (SUA) | $976 | CT DSS chart |
| CT Limited Utility Allowance (LUA) | $430 | CT DSS chart |
| CT Telephone Allowance (TUA) | $36 | CT DSS chart |
| Medical expense deduction (elderly/disabled) | expenses over $35/month | FNS eligibility page |

### Asset limits (CT)

| Situation | Limit | Source |
| --- | --- | --- |
| Categorically eligible households | **No asset limit** | CT DSS chart |
| HH with member age 60+ or disabled AND gross income over 200% FPL | $4,500 | CT DSS chart |
| Lottery/gambling winnings trigger | $4,500 per single game | CT DSS chart |
| Vehicle | Excluded | CT DSS chart |

### FY2027 (effective 10/1/2026)

**UNVERIFIED — not yet published.** As of 2026-08-14, USDA FNS has not posted the FY2027 COLA memo. https://www.fns.usda.gov/snap/allotment/COLA lists FY2026 as the current adjustment. Any FY2027 SNAP number is a guess until USDA posts it. This matters: the hackathon is Aug 19, 2026 and FY2027 figures land Oct 1, 2026.

---

## 2 · HUSKY A and HUSKY D

All figures below are **monthly household income**, from the CT DSS Program Standards Chart, columns marked **eff. 3/1/2026** (built on the 2026 poverty guidelines). Annual = ×12.

| HH size | HUSKY A — Parents/Caretakers (138% FPL) | HUSKY D — Adults 19–64 (138% FPL) | HUSKY A — Children <19 (201% FPL) | HUSKY A/B — Pregnancy (263% FPL) | HUSKY B Band 1 (254% FPL) | HUSKY B Band 2 (323% FPL) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | $1,836 | $1,836 | $2,674 | $3,498 | $3,379 | $4,296 |
| 2 | $2,489 | $2,489 | $3,625 | $4,743 | $4,581 | $5,825 |
| 3 | $3,142 | $3,142 | $4,577 | $5,988 | $5,783 | $7,354 |
| 4 | $3,795 | $3,795 | $5,528 | $7,233 | $6,985 | $8,883 |
| 5 | $4,449 | $4,449 | $6,479 | $8,478 | $8,188 | $10,412 |
| 6 | $5,102 | $5,102 | $7,431 | $9,723 | $9,390 | $11,941 |
| 7 | $5,755 | $5,755 | $8,382 | $10,968 | $10,592 | $13,470 |
| 8 | $6,408 | $6,408 | $9,334 | $12,212 | $11,795 | $14,998 |

Source: https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/fact-sheets-and-issue-briefs/fact-sheets/dss-program-standards-chart-effective-070126.pdf

Notes:
- **HUSKY A parents and HUSKY D use the identical 138% FPL threshold.** The distinguishing fact is household composition (dependent child in the home), not income. The screener must ask about children to route correctly.
- **No asset test** for most HUSKY A / B / D groups (CT DSS chart, "MEDICAL" panel).
- The 138% figure already embeds the standard 5% MAGI disregard on top of the statutory 133%.
- HUSKY C (Medicaid for aged/blind/disabled) uses a Medically Needy Income Limit (MNIL) of 159% of the TFA payment standard: $851 (1), $1,153 (2), $1,455 (3), $1,757 (4) monthly, eff. 3/1/2026 — same source.

### H.R. 1 (2025) work-documentation requirements — **CONFIRMED**

CT DSS states these apply to **HUSKY D, effective January 1, 2027**. The claim in `docs/market-research.md` is accurate.

What is actually required — an individual must satisfy **at least one** of the following per month:

| Requirement | Detail |
| --- | --- |
| Income test | Monthly income at least 80 × the federal minimum wage ($7.25) |
| Work / service | 80 hours/month of work, community service, or qualified training |
| Education | Enrollment at least half-time |
| Combination | Any mix of the above totaling **at least 80 hours per month** |

Exempt categories: pregnant and postpartum individuals; foster youth; veterans with disabilities; medically frail individuals; people with substance use disorders; those already meeting SNAP or TANF work requirements; caregivers of children age 13 and under; people released from incarceration within the last 90 days; and those granted hardship waivers.

Source: https://portal.ct.gov/dss/knowledge-base/articles/general-information/federal-updates-hr1

**Two adjacent H.R. 1 changes the doc does not mention but that hit the same users:**

| Change | Effective | Detail |
| --- | --- | --- |
| SNAP ABAWD expansion | **Began November 2025 — already live** | ABAWD age ceiling raised 55 → 64; dependent-child exemption narrowed from under-18 to **under 14**; exemptions removed for veterans, people experiencing homelessness, those under 24, and former foster youth; waivers restricted to areas with unemployment over 10% |
| Non-citizen eligibility, Medicaid | October 1, 2026 | Restricted to LPRs, Cuban/Haitian entrants, COFA citizens; refugees, asylees, trafficking victims and humanitarian parolees lose eligibility |
| Non-citizen eligibility, SNAP | Same restriction set | Same categories lose eligibility |

Source: same DSS H.R.1 article.

> Product implication: the SNAP ABAWD tightening is **live today**, not a 2027 problem, and it strips exactly the exemptions (veteran, homeless, under-24, former foster youth) that a naive screener would still be crediting. Note also that the USDA FNS public eligibility page still lists the pre-H.R.1 ABAWD exemptions — do not screen SNAP work requirements off the federal page for CT.

---

## 3 · Care 4 Kids

### Income limits — new applications, effective October 1, 2025

Entry limit is **60% of State Median Income**. (Limit at *redetermination* is the higher 85% SMI.)

| Family size | Monthly | Annual |
| --- | --- | --- |
| 1 | $3,980.35 | $47,764 |
| 2 | $5,205.05 | $62,460 |
| 3 | $6,429.80 | $77,157 |
| 4 | $7,654.55 | $91,854 |
| 5 | $8,879.25 | $106,550 |
| 6 | $10,104.00 | $121,247 |
| 7 | $10,333.60 | $124,002 |
| 8 | $10,563.25 | $126,758 |
| 9 | $10,792.90 | $129,514 |
| 10 | $11,022.55 | $132,269 |
| 11 | $11,252.15 | $135,025 |
| 12 | $11,481.80 | $137,781 |

Sources: https://www.ctcare4kids.com/income-guidelines-for-new-applications/ · redetermination limit (85% SMI, eff. 10/1/2025): https://www.ctcare4kids.com/income-guidelines-for-redeterminations/

Also required: child under 13 (or under 19 with special needs), CT residency, and parent working or in an approved education/training activity. Source: https://www.ctcare4kids.com/care-4-kids-program/care4kids-info/

### Intake status — **OPEN BUT WAITLISTED. This is the most important correction in this document.**

| Fact | Value | Source |
| --- | --- | --- |
| Enrollment list in effect since | March 1, 2023 (still in force) | https://www.ctcare4kids.com/important-updates-to-care-4-kids-eligibility/ |
| Status as of | **August 4, 2026** | https://www.ctcare4kids.com/provider-information/status/waitlist/ |
| Currently inviting applications received on or before | **September 15, 2025** | same |
| Stated typical wait | **"about 8 months before a family is invited off the list"** | same |
| Document processing lag | documents received on/before June 5, 2026 entered | https://www.ctcare4kids.com/provider-information/status/ |

Applicants placed on the enrollment list: anyone who is working, attending higher education, or in Workforce Development.
Processed **immediately**, bypassing the list: TFA recipients who are working or in JFES activities; former TFA recipients (within 5 years); teen parents ages 18–19 attending high school or equivalent.

> Product implication: a screener that puts a dollar value on Care 4 Kids next to SNAP is implicitly promising money that is ~8 months away for most applicants. Either label it "waitlist — apply now to start the clock" or the demo overstates. The 8-month clock is actually a *good* argument for applying early, which is a stronger pitch than a dollar figure.

### How the subsidy amount is determined

Three-part mechanism:

1. **State payment rate** — a maximum rate set by OEC, varying by provider type (center vs. home), child age, and hours (full/part-time). Current schedule **effective January 1, 2026**. Incentive add-ons: +25% center-based accreditation, +12.5% home-based NAFCC accreditation, +3% associate's degree in early childhood. Source: https://www.ctcare4kids.com/provider-information/payment-rates/
2. **Family Fee (Family Share)** — the parent's share, a percent of countable income banded by SMI:

   | Countable income as % SMI | Family fee |
   | --- | --- |
   | 0% to <20% SMI | **0%** |
   | 20% to <40% SMI | 3% |
   | 40% to <60% SMI | 5% |
   | 60% to ≤85% SMI | 7% |

   Source: https://www.ctcare4kids.com/family-share/ (page titled "Family Share / Family Fee – effective 1/1/2025"; the 7% cap replaced a prior 10% cap)
3. **The gap** — Care 4 Kids pays the provider (payment rate − family fee). The parent pays the family fee **plus any provider charges above the state rate**. Source: https://www.ctcare4kids.com/family-share/

**UNVERIFIED:** specific dollar payment rates for the Stamford / Fairfield County region. The rate schedules are PDFs linked from the payment-rates page and were not machine-readable in this pass. Do not quote a Stamford weekly rate without opening those PDFs.

---

## 4 · Connecticut Energy Assistance Program (CEAP)

### Income eligibility

- Limit: **60% of State Median Income** (tables in §0 above).
- **Asset limit: none.**
- **Categorically income-eligible** if the household receives SNAP, TFA, Refugee Cash Assistance, State Supplement, or SSI. The first four are auto-verified by DSS data match when applying online; SSI is not. The household still must apply and submit program documents (e.g. a utility bill).

Source: https://portal.ct.gov/dss/-/media/dss/legislative-reports/2025/liheap-csbg-ssbg/ffy-2026-liheap-ceap-fact-sheet.pdf

### Benefit matrix — 2025-2026 season (FFY2026, the season just ended)

| Level | Income | Basic: vulnerable HH | Basic: non-vulnerable HH | Rental assistance |
| --- | --- | --- | --- | --- |
| 1 | At or below 125% FPL | $645 | $595 | $125 |
| 2 | 126% – 200% FPL | $495 | $445 | $100 |
| 3 | 201% FPL – 60% SMI | $345 | $295 | $75 |

Crisis assistance (deliverable-fuel households only): **$425 per delivery, up to 3 deliveries.**
Max realistic case, vulnerable Level 1 deliverable-fuel household: $645 + $425 × 3 = **$1,920**.
"Vulnerable" = a member age 60+, or with a disability, or a child under age 6.

FFY2026 dates: applications opened Sept 1 2025 (online) / Sept 2 2025 (in person); first payable fuel delivery Nov 3 2025; fuel authorization deadline Apr 1 2026; **last day to apply May 29 2026**; last vendor billing June 17 2026.

Source: https://portal.ct.gov/dss/-/media/dss/legislative-reports/2025/liheap-csbg-ssbg/ffy-2026-liheap-ceap-fact-sheet.pdf

### Benefit matrix — 2026-2027 season (FFY2027) — **PROPOSED, not final**

The FFY2027 plan is labeled *proposed*; public hearing was held **August 12, 2026** (two days before this research). Amounts may change; the plan itself says DSS may adjust benefits if the final federal award differs.

| Level | Income | Basic: vulnerable HH | Basic: non-vulnerable HH | Rental assistance |
| --- | --- | --- | --- | --- |
| 1 | At or below 125% FPG | $705 | $655 | $140 |
| 2 | 126% – 200% FPG | $555 | $505 | $115 |
| 3 | 201% FPG – 60% SMI | $405 | $355 | $90 |

Crisis assistance: **$430 per issuance, up to 3.** Utility-heated households are *not* eligible for crisis benefits — they are protected from winter disconnection under CGS §16-262c and are instead routed to the Matching Payment Program.
FFY2027 program year: Oct 1 2026 – Sept 30 2027. First payable fuel delivery Nov 2 2026; fuel authorization deadline Apr 1 2027; last day to apply **May 31 2027**; last billing June 17 2027.
150% FPG categorical reference table in the plan: $23,940 (1) / $32,460 (2) / $40,980 (3) / $49,500 (4) / $58,020 (5) / $66,540 (6) / $75,060 (7) / $83,580 (8).

Sources: https://portal.ct.gov/dss/economic-security/winter-heating-assistance/energy-assistance---winter-heating/ffy27-liheap-allocation-plan · https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/winter-heating-assistance/ffy-27-liheap-allocation-plan.pdf

### ⚠ Conflicting CT.gov page — do not use

The DSS "Winter Heating — Benefits" page (https://portal.ct.gov/DSS/Economic-Security/Winter-Heating-Assistance/Energy-Assistance---Winter-Heating/Benefits) currently states a **maximum basic benefit of $1,015 vulnerable / $940 non-vulnerable, minimum $410, renters $225–$475, crisis up to $1,010 or $500, safety net up to $700 per delivery.** These figures match **neither** the FFY2026 fact sheet nor the FFY2027 proposed plan. The page appears stale (likely carrying figures from a supplemental-funding year). **Use the allocation plan / fact sheet numbers above, not that page.**

---

## 5 · Federal EITC and Connecticut EITC

### Federal EITC — tax year 2025

| Qualifying children | Max credit | Max AGI: single / HoH / MFS / QSS | Max AGI: married filing jointly |
| --- | --- | --- | --- |
| 0 | $649 | $19,104 | $26,214 |
| 1 | $4,328 | $50,434 | $57,554 |
| 2 | $7,152 | $57,310 | $64,430 |
| 3 or more | $8,046 | $61,555 | $68,675 |

Investment income limit: **$11,950 or less.**

Sources: https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/earned-income-and-earned-income-tax-credit-eitc-tables · underlying inflation adjustments Rev. Proc. 2024-40 §2.06, https://www.irs.gov/pub/irs-drop/rp-24-40.pdf

**UNVERIFIED:** the exact phase-in rates and phase-out *start* thresholds by filing status. Only the maximum credit and the completed-phase-out AGI ceilings were confirmed from primary source. Do not compute a mid-range EITC estimate without pulling Rev. Proc. 2024-40 §2.06 or Pub. 596 in full: https://www.irs.gov/pub/irs-pdf/p596.pdf

### Connecticut EITC — tax year 2025

| Item | Value | Source |
| --- | --- | --- |
| CT EITC rate | **40% of the federal EITC** | 2025 Schedule CT-EITC, Line 9: *"Connecticut EITC rate: 40% (.40)"* — https://portal.ct.gov/-/media/drs/forms/2025/income/schedule-ct-eitc_1225.pdf |
| Additional flat credit | **+$250** for any taxpayer eligible for the EITC with **at least one qualifying child** | 2025 Schedule CT-EITC, final line: *"If Yes, enter $250.00."* — same PDF; also stated at https://portal.ct.gov/drs/ct---eitc/ct-eitc-information/ct-earned-income-tax-credit |
| Gating rule | Must have claimed the **federal** EITC for 2025; otherwise "Stop; you do not qualify for the CT EITC" | 2025 Schedule CT-EITC, Line 1 |
| Residency | Full-year Connecticut resident | DRS CT-EITC page |

Maximum combined federal + CT credit, TY2025 (CT portion computed as 40% of federal max, plus the $250 where applicable):

| Qualifying children | Federal max | CT max (40%) | CT +$250 | **Combined max** |
| --- | --- | --- | --- | --- |
| 0 | $649 | $259.60 | — | **$908.60** |
| 1 | $4,328 | $1,731.20 | $250 | **$6,309.20** |
| 2 | $7,152 | $2,860.80 | $250 | **$10,262.80** |
| 3+ | $8,046 | $3,218.40 | $250 | **$11,514.40** |

The CT column is *computed* by applying the verified 40% rate and $250 add-on to the verified federal maximums; the DRS page carries a "Max State EITC @40% of Federal" table that agrees with the method.

> Product implication: the market-research doc's "~$3,000 of unclaimed EITC" for the Maria persona (2 kids, $25k) is **materially low** — the two-child federal maximum alone is $7,152, and CT adds 40% plus $250 on top. See §7 for the flag.

---

## 6 · CT Elderly / Disabled Renters' Rebate

Administered by the **Office of Policy and Management (OPM)**; applications are taken by the **municipality** (assessor's office or social service agency), not by the state.

### 2026 program year (income year 2025)

| Item | Value | Source |
| --- | --- | --- |
| Age / disability | 65+, **or** 50+ surviving spouse of a previously qualified renter, **or** 18+ receiving Social Security Disability | OPM program page |
| Age test date | Must have been 65 as of **December 31, 2025** | OPM Renters' Rebate Q&A booklet, 2026 edition |
| Residency | One-year CT residency | OPM program page |
| **Income limit — unmarried** | **$46,300** (calendar year 2025 qualifying income) | OPM Q&A booklet, Q1(3) and Q49 |
| **Income limit — married** | **$56,500** (combined, calendar year 2025) | OPM Q&A booklet, Q1(3) and Q49 |
| Max rebate — single | **$700** | OPM program page |
| Max rebate — married | **$900** | OPM program page |
| Minimum payable check | rebate must compute to **$10.00 or more** to be issued | OPM Q&A booklet, Q33 |
| Application window | **April 1 – September 30, 2026**, no extensions | OPM program page + Q&A booklet |
| Payment by | on or before November 30; contact OPM by December 15 if unpaid | OPM program page |
| OPM hotline | 860.418.6377 | OPM program page |

Sources: https://portal.ct.gov/opm/igpp/grants/tax-relief-grants/renters--rebate-for-elderly-disabled-renters-tax-relief-program · https://portal.ct.gov/opm/-/media/opm/igpp-data-grants-mgmt/q-and-a-tax-relief-booklets/renters-rebate-qa-booklet.pdf

### Rebate calculation (CGS §12-170d)

The grant is the **lesser of**:
1. the maximum grant allowed by the income table for the applicant's income bracket, **or**
2. **35% of** rent + electricity + gas + water + fuel actually paid during the benefit year, **less 5% of qualifying income**,

…**or the minimum, if that is greater.**

Consequence worth encoding: if 35% of rent+utilities is *less than* 5% of qualifying income, **the applicant gets nothing** (Q57). Shared apartments are prorated — each unmarried adult is assumed to pay a proportionate share (50% each if two adults) (Q58).

"Qualifying income" = **all taxable and nontaxable income**, including net Social Security from Box 5 of the SSA-1099. Federal tax return copy is required if one was filed. Part-year renters have income apportioned by months rented.

Source: OPM Q&A booklet Q26, Q34, Q56–Q59.

### Social Security COLA adjustment (2026)

The prior-year Social Security figure is back-calculated: 2026 monthly benefit × (1 − 0.028 COLA) → 2025 monthly, ×12, plus Medicare premiums of **$2,184.00** (unmarried) or **$4,368.00** (married). Source: OPM Q&A booklet Q52.

### How Stamford administers it

Handled by the **City of Stamford Department of Health and Human Services, Division of Housing Services**, which posts a "2026 Rent Rebate Application for Seniors & Disabled."
Page: https://www.stamfordct.gov/government/public-safety-health-welfare/health-human-services/programs-services/seniors-and-adults-with-disabilities/renters-rebate-program
Related: https://www.stamfordct.gov/government/public-safety-health-welfare/health-human-services/housing-services

**UNVERIFIED:** Stamford's specific intake mechanics — appointment vs. walk-in, required document list, local deadline, and contact phone. The stamfordct.gov pages return HTTP 403 to automated fetches (Akamai edge block); they must be opened in a browser by a human to capture these details. Do not assert Stamford's process in the pitch without that check.

---

## 7 · Keychain discounts — live vs. dead

| Program | Status | Current benefit | Source |
| --- | --- | --- | --- |
| **Lifeline (FCC/USAC)** | ✅ **LIVE** | **$9.25/month** off phone, internet, or bundled service; **$34.25/month** on qualifying Tribal lands | https://www.lifelinesupport.org/about-lifeline/ |
| **ACP** | ❌ **DEAD** — do not name on stage | Stopped new enrollments **Feb 8, 2024**; last discounts **June 1, 2024**; was $30/mo ($75 Tribal) + one-time $100 device | https://www.fcc.gov/acp · https://www.fcc.gov/sites/default/files/ACP-Fact-Sheet-Post-ACP-Ending.pdf |
| **Eversource CT Low-Income Discount Rate** | ✅ **LIVE** | 5-tier: **5% / 15% / 20% / 40% / 50%** off electric | https://www.eversource.com/residential/account-billing/payment-assistance/discount-rate/ct |
| **United Illuminating LIDR** | ✅ **LIVE** | 2-tier: **10% or 50%** off | https://portal.ct.gov/heatinghelp/utility-assistance-information |
| **Matching Payment Program (Eversource + UI, electric & gas)** | ✅ **LIVE** | Utility matches every dollar the customer pays **and** every CEAP dollar received; requires hardship status + past-due balance over $100 for 60+ days | https://portal.ct.gov/heatinghelp/utility-assistance-information |
| **Museums for All** | ✅ **LIVE** | **Free to $5.00** admission for **up to 4 people per EBT card**, photo ID required, 1,600+ museums in all 50 states + DC + USVI | https://museums4all.org/for-visitors/ · https://museums4all.org/about/ |
| **YMCA of Stamford sliding scale** | ⚠️ **UNVERIFIED** | see below | — |

### Lifeline eligibility (2026 guidelines)

Income at or below **135% of the 2026 Federal Poverty Guidelines**, or participation in Medicaid, SNAP, SSI, Federal Public Housing Assistance, or Veterans Pension / Survivors Benefit.

| HH size | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Annual limit | $21,546 | $29,214 | $36,882 | $44,550 | $52,218 | $59,886 | $67,554 | $75,222 |

(+$7,668 per additional person.) Source: https://www.lifelinesupport.org/how-to-qualify/

> Note for the keychain framing: a Stamford SNAP or HUSKY household is **automatically** Lifeline-eligible via program participation — no separate income proof needed. That is the cleanest "one key opens the next lock" example available.

### Eversource CT LIDR income thresholds (annual household income)

| Tier | HH 1 | HH 4 |
| --- | --- | --- |
| 5% discount | $48,714 | $93,681 |
| 15% discount | $33,676 | $69,630 |
| 20% discount | $25,536 | $52,800 |
| 40% discount | $19,950 | $41,250 |
| 50% discount | $15,960 | $33,000 |

Cross-check: the 50% tier is exactly **100% FPG (2026)**, the 40% tier is **125% FPG**, and the 5% tier is exactly **60% SMI (FFY2027)** — the thresholds are pinned to the same tables used above.

Alternative qualification: receiving SNAP, HUSKY, SSI/SSDI, Medicaid, Section 8, or CEAP. If DSS certifies benefit receipt, enrollment **auto-renews**. Discount applies to electric service only, on the first 1,200 kWh/month (heating customers) or 800 kWh/month (non-heating). Enroll via a Community Action Agency, online upload, mail, fax 866-438-6476, or 800-286-2828. UI enrollment: 800-722-5584.
Source: https://www.eversource.com/residential/account-billing/payment-assistance/discount-rate/ct

Confirmed by the FFY2027 LIHEAP plan: applying for CEAP causes the utilities to **automatically enroll eligible customers in LIDR** — a genuine already-wired keychain link worth citing.

### YMCA of Stamford — cannot verify

- The YMCA of Stamford is listed as operating at 10 Bell Street, Stamford CT 06901, with posted hours, on YMCA of the USA's official directory: https://www.ymca.org/locations/ymca-stamford — that page says **nothing** about financial assistance or sliding-scale rates.
- The branch website it points to, **stamfordymca.org, returns HTTP 404 on the root and on every membership subpage** as of 2026-08-14. Search engines index `stamfordymca.org/membership/financial-assistance/` under an unrelated commercial title ("Happy Family Store"), suggesting the domain is expired, parked, or compromised.
- YMCA of the USA's national join page states nothing about income-based rates.

**Conclusion: mark UNVERIFIED.** Do not put a YMCA sliding-scale dollar figure or a stamfordymca.org link on a slide — the link is dead and may resolve to spam in front of judges. If the keychain needs a fitness/recreation key, either (a) phone the branch at 10 Bell Street to confirm a financial-assistance program before the 19th, or (b) substitute a verified key such as Museums for All or the Eversource LIDR.

---

## 8 · Review of `docs/market-research.md` — errors, staleness, and risks

Reviewed against the verified figures above. Ordered by how much damage each does on stage.

### Must fix

| # | Location | Claim | Verdict |
| --- | --- | --- | --- |
| 1 | §7 beat 4, §8 "Research & insight" | "~$3,000 of unclaimed EITC" for Maria (2 kids, ~$25k, single) | **UNDERSTATED, roughly 3×.** TY2025 federal max for 2 children is **$7,152**; CT adds 40% ($2,860.80) plus **$250**. The pitch is leaving its single most impressive number on the table. Recompute Maria's actual EITC before the 19th (needs the phase-out math — see §5 UNVERIFIED note) and quote the real figure. |
| 2 | §2 persona, §3 eligibility map, §7 beat 3 | Care 4 Kids listed as a benefit with a dollar value, no qualifier | **MISLEADING.** Care 4 Kids has had an enrollment list since March 2023; as of **Aug 4, 2026** it is inviting applications received **Sept 15, 2025** — a **~8-month** wait. Showing it as claimable money invites a judge to call it. Relabel: "waitlist — apply now, ~8-month queue." |
| 3 | §11 Data Specialist row | "Verify current CT program names + rough thresholds" — SNAP thresholds unstated | **CT-SPECIFIC TRAP.** CT uses **BBCE at 200% FPL** ($4,442/mo for HH3), not the federal 130% ($2,888). A screener built on the federal number wrongly rejects a large share of Stamford applicants. This is also a *great* pitch point — "the national screeners get Connecticut wrong." |
| 4 | Second half, "Step 2: The Screener Demo" | "instantly matching them for CEAP energy assistance ($295–$645)" | **CORRECT for the 2025-26 season, expiring in 6 weeks.** The proposed FFY2027 matrix (season opens Oct 1 2026) is **$355–$705** basic, crisis $430. Since the event is Aug 19 2026, either cite 2025-26 explicitly or use the FFY2027 proposed range with the "proposed" caveat. |
| 5 | Second half, "Step 2" | Screener demo input "$45,000 income + $10,000 Social Security" warns about "Stamford's property tax relief non-taxable income inclusion" | **Directionally right, but note the renters' rebate limits are far below this**: $46,300 unmarried / $56,500 married, and **qualifying income includes net Social Security**. A $55,000 combined figure is over the unmarried limit. Check the demo numbers actually produce the intended result. |

### Correct as written — leave alone

| # | Claim | Verdict |
| --- | --- | --- |
| 6 | "H.R. 1 (2025) adds work-documentation requirements for HUSKY D starting January 2027" | ✅ **CONFIRMED** by CT DSS. 80 hrs/month of work, community service, qualified training, half-time education, or a combination; or income ≥ 80 × $7.25. Attribute to **CT DSS**, not to United Way/211 — it is stronger from the agency. |
| 7 | "ACP defunded 2024 — do not name dead programs on stage" | ✅ **CONFIRMED.** Enrollments stopped Feb 8 2024, benefits ended June 1 2024. |
| 8 | Keychain names Lifeline, utility discount rates, Museums for All | ✅ All three verified live. Lifeline $9.25/mo; Eversource 5–50%, UI 10%/50%; Museums for All free–$5 for up to 4 people. |
| 9 | "HUSKY/SNAP requires tracking 80 hours/month of work activity" (Pillar A) | ✅ Substantially right, but they are **two different rules**: SNAP ABAWD is 20 hrs/week and is **already live since Nov 2025**; HUSKY D's 80 hrs/month starts **Jan 1 2027**. Say which is which. |
| 10 | "CT counts non-taxable income (Social Security) toward tax relief limits" (Pillar A) | ✅ **CONFIRMED** — OPM defines qualifying income as "all taxable and nontaxable income," explicitly including net Social Security from SSA-1099 Box 5. |

### Add — verified facts that strengthen the pitch and are currently missing

| # | Addition | Why it helps |
| --- | --- | --- |
| 11 | **CEAP has no asset limit and grants categorical eligibility to SNAP/TFA/SSI/State Supplement households, auto-verified by DSS data match when applying online.** | This is the keychain, already working, in government's own words — the best available proof the model is real, not speculative. |
| 12 | **Applying for CEAP auto-enrolls eligible customers in the Eversource/UI Low-Income Discount Rate** (stated in the FFY2027 LIHEAP plan). | One application → a second benefit, automatically. Exactly the product thesis, sourced to a state plan. |
| 13 | **HUSKY A parents and HUSKY D share the same 138% FPL line; only the presence of a child decides which one you're in.** | Concrete demonstration of "the AI maps life circumstances to programs" — a fact a resident cannot be expected to know. |
| 14 | **A SNAP or HUSKY household is automatically Lifeline-eligible via program participation** — no income proof needed. | Cleanest one-sentence keychain example available. |
| 15 | **Care 4 Kids family fee is capped at 7% of income and is 0% below 20% SMI.** | Lets the eligibility map show *net* childcare cost, not just "eligible." |
| 16 | **SNAP ABAWD exemptions for veterans, homeless individuals, under-24s, and former foster youth were removed in Nov 2025**; the USDA FNS public page still lists them. | Sharper and more current than "18,900 CT kids lost SNAP," and it is a live example of official sources being stale — which is itself an argument for a maintained tool. |

### Sourcing hygiene

| # | Issue | Recommendation |
| --- | --- | --- |
| 17 | Headline stats are attributed to Benefit Kitchen, NCOA, Tax Policy Center, CT Mirror, Beeck Center, Code for America, BenefitsUSA | None are primary. **Not verified in this pass** — out of scope, which was CT program facts. Before the 19th, either trace each to its origin (USDA/Census/IRS/TIGTA) or soften the attribution. The "18,900 CT children lost SNAP (CT Mirror, July 2026)" figure in particular is quoted twice including in the opening line of the pitch. |
| 18 | "$34k–$52k/year combined benefits for a family of four at ~$30k income (BenefitsUSA analysis, 2025–26)" | **Not verified.** This is the second of the pitch's three headline numbers and its source is an aggregator. It is now buildable bottom-up from this document (SNAP max HH4 $994/mo = $11,928/yr; CEAP up to ~$1,920; EITC + CT EITC up to ~$10,263 for 2 kids; HUSKY; Care 4 Kids) — a self-computed, fully sourced total would be far more defensible under questioning. |
| 19 | CT DSS "Winter Heating — Benefits" page conflicts with both CEAP allocation plans | Do not cite that page (see §4 warning). Cite the FFY2026 fact sheet or FFY2027 plan PDF instead. |

### Timing risk

| # | Risk | Detail |
| --- | --- | --- |
| 20 | SNAP FY2027 figures land **Oct 1, 2026** | Not yet published as of 2026-08-14. Every SNAP number in the demo is a ~6-week-shelf-life figure. Label the demo "FY2026 (Oct 2025–Sep 2026)" so it reads as precise rather than stale. |
| 21 | CEAP FFY2027 is **proposed**; hearing was Aug 12, 2026 | Amounts may shift; the plan states DSS may adjust if the federal award differs. Say "proposed" if quoting $355–$705. |
| 22 | Stamford renters' rebate window **closes Sept 30, 2026** | Six weeks after the event — a genuine urgency hook for the pitch, and a real deadline if any demo output is ever shown to a resident. |

---

## 9 · Source index

**CT DSS**
- Program Standards Chart (as of 7/1/2026) — SNAP, TFA, HUSKY A/B/C/D, MSP, SSI, deductions, asset limits: https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/fact-sheets-and-issue-briefs/fact-sheets/dss-program-standards-chart-effective-070126.pdf
- SNAP eligibility: https://portal.ct.gov/dss/snap/supplemental-nutrition-assistance-program---snap/eligibility
- H.R.1 federal updates: https://portal.ct.gov/dss/knowledge-base/articles/general-information/federal-updates-hr1
- LIHEAP-CEAP fact sheet, PY 2025-2026: https://portal.ct.gov/dss/-/media/dss/legislative-reports/2025/liheap-csbg-ssbg/ffy-2026-liheap-ceap-fact-sheet.pdf
- FFY2027 LIHEAP allocation plan (proposed): https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/winter-heating-assistance/ffy-27-liheap-allocation-plan.pdf
- Heating Help — CEAP: https://portal.ct.gov/heatinghelp/connecticut-energy-assistance-program-ceap
- Heating Help — utility assistance (LIDR, MPP): https://portal.ct.gov/heatinghelp/utility-assistance-information

**CT OPM** — Renters' Rebate program page: https://portal.ct.gov/opm/igpp/grants/tax-relief-grants/renters--rebate-for-elderly-disabled-renters-tax-relief-program · 2026 Q&A booklet: https://portal.ct.gov/opm/-/media/opm/igpp-data-grants-mgmt/q-and-a-tax-relief-booklets/renters-rebate-qa-booklet.pdf

**CT DRS** — CT EITC: https://portal.ct.gov/drs/ct---eitc/ct-eitc-information/ct-earned-income-tax-credit · 2025 Schedule CT-EITC: https://portal.ct.gov/-/media/drs/forms/2025/income/schedule-ct-eitc_1225.pdf

**CT OEC / Care 4 Kids** — new-application income guidelines: https://www.ctcare4kids.com/income-guidelines-for-new-applications/ · redetermination: https://www.ctcare4kids.com/income-guidelines-for-redeterminations/ · enrollment list status: https://www.ctcare4kids.com/provider-information/status/waitlist/ · family fee: https://www.ctcare4kids.com/family-share/ · payment rates: https://www.ctcare4kids.com/provider-information/payment-rates/ · eligibility updates: https://www.ctcare4kids.com/important-updates-to-care-4-kids-eligibility/ · state page: https://portal.ct.gov/oec/care4kids

**USDA FNS** — SNAP eligibility, limits, allotments, formula: https://www.fns.usda.gov/snap/recipient/eligibility · COLA index: https://www.fns.usda.gov/snap/allotment/COLA

**IRS** — EITC tables: https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/earned-income-and-earned-income-tax-credit-eitc-tables · Rev. Proc. 2024-40: https://www.irs.gov/pub/irs-drop/rp-24-40.pdf · Pub. 596 (2025): https://www.irs.gov/pub/irs-pdf/p596.pdf

**HHS ASPE** — 2026 poverty guidelines: https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines · Federal Register: https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines

**FCC / USAC** — Lifeline: https://www.lifelinesupport.org/about-lifeline/ · https://www.lifelinesupport.org/how-to-qualify/ · ACP ended: https://www.fcc.gov/acp · https://www.fcc.gov/sites/default/files/ACP-Fact-Sheet-Post-ACP-Ending.pdf

**Eversource** — CT discount rate: https://www.eversource.com/residential/account-billing/payment-assistance/discount-rate/ct

**Museums for All** — https://museums4all.org/for-visitors/ · https://museums4all.org/about/

**City of Stamford** — Renters' Rebate: https://www.stamfordct.gov/government/public-safety-health-welfare/health-human-services/programs-services/seniors-and-adults-with-disabilities/renters-rebate-program (403 to automated fetch; open manually)

**YMCA** — YMCA of the USA directory listing: https://www.ymca.org/locations/ymca-stamford (branch site stamfordymca.org returns 404)
