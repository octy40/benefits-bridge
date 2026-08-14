**Hi Team, Below is some research and feedback to consider from tonight's open office hours.**

**We are going to have a call tomorrow time TBD, start time 2, 3, or 4pm to discuss these and other inputs, finalize our idea and discuss the next steps to prepare for next week's presentation and prototype/demo.**

**Everyone, please now use this opportunity to engage if you are able to and advise which times work for you. So far only Octave, Siddhu and I have engaged.**

**Thanks\!**

**Matt**

**BenefitBridge**

*One conversation. Every benefit. (Working title — rename freely.)*

Cost of Living Team · Building with AI: Stamford Micro-Hackathon · August 19, 2026

**How this document maps to the event:** the hackathon requires five deliverables — problem \+ target user, solution \+ feature set, supporting research, a prototype, and a five-minute presentation. Sections 1–2 cover the problem and user, 3 the solution, 4 the research, 5–6 the competition and prototype, 7 the pitch, and 8–10 the scoring maps, metrics, and role assignments.

# **1 · The problem**

Roughly $80 billion in benefits goes unclaimed by over 100 million Americans every year *(Benefit Kitchen)* — not because people don't qualify, but because every program has its own form, its own document requirements, and its own office. Existing screeners tell a resident what they *might* qualify for, then abandon them at a list of links. **Eligibility isn't the barrier; paperwork is.**

And the paperwork is about to get heavier. Federal changes under H.R. 1 (2025) add work-documentation requirements for Connecticut's HUSKY D Medicaid population starting January 2027 *(United Way of CT / 211\)*, and nearly 18,900 Connecticut children have lost SNAP benefits over the past year *(CT Mirror, July 2026\)*. Administrative burden is growing right now — a tool that shrinks it is timely, not evergreen.

***How might we help a low-income Stamford parent claim every benefit they qualify for, despite each program demanding its own forms, proofs, and processes?***

# **2 · Target user & persona**

**Primary user:** low-to-moderate-income Stamford residents — smartphone-first, often multilingual, time-poor, and unaware of most of what they qualify for. **Customer:** the municipality or state, which wants higher benefit uptake (federal dollars flowing into the local economy) and lower caseworker load.

**Why Stamford specifically:** 42.6% of residents speak a language other than English at home and 31.1% are foreign-born — roughly double the Connecticut rate *(Census Reporter / ACS)*. With \~139,000 residents and a poverty rate near 10%, that's roughly 13–14,000 people below the poverty line in a city where nearly half of homes don't default to English. Multilingual, low-friction access isn't a feature here; it's table stakes.

## **Demo persona — "Maria"**

•      Single mom, two kids (ages 4 and 9), Stamford renter. Works retail, \~$25k/year, paid partly in cash. Hasn't filed taxes in two years — assumed she didn't need to since she owes nothing.

•      Speaks Spanish at home. Smartphone only — no laptop, prepaid data plan.

•      Currently receives: nothing. Likely eligible for: SNAP, HUSKY A (kids and herself), Care 4 Kids childcare subsidy, energy assistance, WIC-adjacent programs for the 4-year-old, federal \+ CT EITC, Child Tax Credit — plus the discounts those unlock.

•      Her mom moved in last year — the fact she'd never think to mention, and the one that changes her eligibility picture. This is the scripted inference moment in the demo.

# **3 · The solution & feature set**

A conversational AI caseworker, offered by a state or municipality to its residents. One natural conversation replaces a dozen application intakes:

•      **Guided elicitation.** The bot asks about the person's life — household, kids and ages, income, housing, work — the way a good caseworker would. Users never need to know which facts matter; the AI maps life circumstances to programs, including ones people don't self-identify into (veteran status, a parent moving in, pregnancy, gig income).

•      **Eligibility map with dollar values.** A results screen showing likely-eligible programs — SNAP, HUSKY, energy assistance, Care 4 Kids, EITC — each with an estimated dollar value attached.

•      **Document preparation.** When an application needs proof the person doesn't have (e.g., a tax return to verify $25k income), the tool helps produce it — and flags upside, like \~$3,000 of unclaimed EITC from filing. Nationally, most unclaimed EITC traces to people who never filed a return at all *(Tax Policy Center)* — filing help isn't a side feature, it's where the money is.

•      **Answer once, apply everywhere.** Information gathered in the conversation is reused across every program's forms. The demo moment: one application, auto-filled on screen.

•      **The keychain.** Qualifying for one means-tested program unlocks private-sector and nonprofit discounts almost nobody claims — phone/internet (Lifeline), utility discount rates, Museums for All, low-cost bank accounts, YMCA sliding scale. We surface the whole keychain, since eligibility is already established.

•      **Any language, any channel.** The entire flow — conversation, results, forms — in the resident's language, over web or SMS (see §6).

•      **Follow-through, not just intake.** Proactive nudges at recertification deadlines. Nearly 1 in 5 SNAP recipients lose benefits around recertification *(Beeck Center / BDT)* — retention is worth as much as enrollment.

# **4 · Market research (pitch segment: "Research & insight")**

## **The size of the problem**

| Finding | Source |
| :---- | :---- |
| \~$80B in benefits unclaimed annually by 100M+ Americans | Benefit Kitchen |
| $58B/year unclaimed by older adults alone (SNAP, SSI, Medicare Savings) | National Council on Aging |
| \~5M eligible taxpayers skip the EITC each year (\~$7B); two-thirds of unclaimed dollars trace to non-filers | Tax Policy Center / TIGTA |
| Combined benefits for a qualifying family of four at \~$30k income: $34k–$52k/year | BenefitsUSA analysis, 2025–26 |
| SNAP churn: 17–28% across studied states, mostly at recertification | USDA / Urban Institute via Beeck Center |
| Only 38% of eligible adults 65+ participated in SNAP (2023) | NCOA |

 

## **Why Connecticut is a receptive buyer**

•      **The state already texts benefits clients — and scaled it.** Code for America partnered with CT DSS starting 2022; the initial three-month pilot sent 200,000+ texts to SNAP clients statewide, then expanded to Medicaid and cash programs *(Code for America)*. The channel is proven and the buyer already adopted it. We are the natural next step: the state texts reminders — we make the text do the paperwork.

•      **The state is already piloting AI.** Connecticut runs an internal AI Enablement Lab with \~20 use cases deployed or piloted by 2025, including automated citizen Q\&A *(Code for America Government AI Landscape, 2026\)*. Nationally, nearly half of states report using AI chatbots, with resident portals the top future use case *(NASTD via payitgov)*.

•      **The timing is urgent.** H.R. 1 work-documentation requirements hit HUSKY D in January 2027; 18,900 CT children lost SNAP in the past year. Paperwork burden is rising as we launch.

 

## **Channel & access evidence (backs §6)**

•      27% of adults in households under $30k/year are smartphone-only internet users *(Pew Research)*.

•      Home broadband among the lowest-income group fell to \~54% in 2025, down from 57% in 2023–24 *(Pew via Telecompetitor)* — the access gap is widening, not closing.

•      Precedent for simplification: California's old SNAP application ran \~200 questions over 55 screens (\~1 hour); GetCalFresh cut it to \~8 minutes *(Code for America)*. Our line: from 200 questions to one conversation.

# **5 · Competitive landscape (rubric criterion 3\)**

| Who | What they do | Where they stop |
| :---- | :---- | :---- |
| Screeners: findhelp, 211, Benefit Kitchen, ConneCT | findhelp: \~90-second eligibility check \+ program list. Benefit Kitchen: dollar-level estimates across 18 programs, sold mostly to caseworker orgs. | The journey ends at a list of links — "now go fill out five applications." |
| mRelief | SNAP screening by SMS — text FOOD (or COMIDA) to a short code, 3-minute screener. Proves texting works for this population. | One program, screening \+ referral only. No multi-program prep, no documents. |
| Propel (Providers app) | $71M raised; the biggest consumer player. | Manages benefits you already have. Doesn't get you enrolled. |
| Single-program applicators: GetCalFresh, GetYourRefund | Excellent guided application — for one program. | Users re-enter the same data for every additional program. |
| Nava (LA pilot) | AI chatbot answering benefits questions with cited sources. | Built for caseworkers, not residents. The resident-facing lane is open. |
| Government portals | Official applications. | Forms-first, English-first, assume you already have your documents. |

 

**Our claim in one sentence:** everyone else answers "what am I eligible for?" — we answer "get it for me." One conversation → every program → the documents you're missing → the discounts your eligibility unlocks.

**Honest framing on SMS:** mRelief proved SMS screening works for SNAP. Nobody has done the full journey — every program, the documents, the applications — through one conversation. Name them before a judge does.

# **6 · Access & channels — one brain, many doors**

The population that most needs this tool is the least likely to have a laptop, home broadband, or room on their phone for another app. **Channel choice is an equity decision.** The same AI caseworker is reachable through whichever door the resident already uses:

| Door | Why it matters | Status |
| :---- | :---- | :---- |
| Web chat (mobile-first) | Short link, no app, no account. Works from a phone, a library computer, or a caseworker's desk. | Primary — this is what we demo |
| SMS | Works on every phone, every plan, zero data. Text "BENEFITS" to a city-published number. Also the only reliable channel for recertification nudges — where 1 in 5 lose benefits. | Demo as a 30-second beat — mocked phone frame, clearly labeled |
| RCS | Rich cards inside the native messaging app; carrier support still uneven, SMS fallback needed anyway. | Roadmap: "SMS today, RCS-enhanced where supported" |
| Voice line | Reaches elderly residents, low-literacy users, flip phones. "Call this number" is something a librarian can hand to anyone. | What's-next |
| WhatsApp | Default channel for many immigrant communities in Stamford. | What's-next, one sentence in pitch |
| Assisted mode | A caseworker, librarian, or family member runs the conversation on someone's behalf — a large share of real applications are mediated by a helper. | What's-next; mention in pitch |

 

## **Conversational-SMS best practices (bake into the design)**

•      **Resumable sessions.** People answer texts in fragments across a day: "Welcome back — we were on your household size."

•      **One question at a time.** SMS enforces the progressive-disclosure discipline we already wanted.

•      **Free to the user.** Municipality-sponsored short code; honest "message rates may apply."

•      **Trust against scam-text fatigue.** Number published by the city (211, mailers, library, school flyers); verified sender; never ask for SSN or bank details over text.

•      **Language detection from the first message.** Text in Spanish or Haitian Creole and the conversation continues in it.

•      **Privacy on shared phones.** Sensitive details deletable on request; nudges carry no dollar amounts or case specifics ("You have an update — reply READY").

**Pitch line:** *"No app. No account. No broadband. If you can text, you can claim what you're owed."*

# **7 · Prototype — demo scope for the 19th**

One end-to-end thread, one persona (Maria). Everything else is cut or moved to "what's next." The rubric rewards one workflow that runs over breadth that doesn't.

| \# | Beat | What judges see |
| :---- | :---- | :---- |
| 1 | Conversational intake | Maria chats naturally: "I make about $25k, two kids, rent is killing me." The bot asks a few caseworker-style follow-ups. |
| 2 | The inference moment | She mentions in passing that her mom moved in. The bot: "She may qualify for the elderly renter rebate — and claiming her as a dependent could increase your EITC." Real AI inference, not a decision tree. |
| 3 | Eligibility map | Programs with estimated dollar values in two tiers: government programs \+ unlocked private discounts (the keychain). Headline number on screen: total annual value. |
| 4 | Burden reduction | The bot flags the missing tax return, notes the \~$3,000 EITC upside, then shows one application form auto-filled from the conversation. |
| 5 | Language toggle | The entire flow flips to Spanish in one tap. |
| 6 | SMS beat (30 sec) | The same conversation in a text-message thread — mocked phone frame, clearly labeled. "No app. No account. No broadband." |

 

**Explicitly out of scope for the prototype:** actual tax filing, real submission to agencies, agency integrations, account creation. These are the "what's next" story, framed as the B2G model: cities want benefit uptake because it pulls federal dollars into the local economy — Stamford is the customer, residents are the users, and CT's texting practice \+ AI Lab show the buyer is real.

## **Design principles**

•      **Ask progressively, not as an interrogation.** Top 3–4 facts, show preliminary results early, then refine. People abandon long intakes.

•      **Screen and prepare — never determine.** Copy says "you likely qualify," never "you qualify." Final determinations stay with the agency.

•      **Data stays with the government customer.** Session-only for the prototype; in production the agency hosts it — never monetized or shared.

# **8 · The five-minute pitch (skeleton)**

| Segment | Time | Content |
| :---- | :---- | :---- |
| Problem & user | 0:45 | Maria on screen. "$80 billion goes unclaimed every year. 18,900 Connecticut kids lost SNAP in the last twelve months. Not because families don't qualify — because paperwork wins." State the How-might-we. |
| Research & insight | 0:45 | Three numbers, one insight: $80B national → 18,900 CT kids → $34–52k/year for one family. Insight: most unclaimed EITC money belongs to people who never filed a return — the barrier is documents, not awareness. CT already texts SNAP clients at scale; the buyer exists. |
| Solution & demo | 2:00 | Live demo, beats 1–5 from §7. Land the inference moment and the auto-filled form; those two are the demo. |
| Impact & differentiation | 1:00 | The keychain line: "Qualifying for SNAP isn't one benefit — it's a keychain. Most people only ever use the first key." Competitor grid in one breath: screeners stop at a list, mRelief does one program, Propel manages what you already have — we answer "get it for me." SMS beat here (30 sec of this minute). |
| Next step | 0:30 | B2G pilot with one CT municipality: real program rules, agency-hosted data, recertification nudges. "The state texts reminders today. We make the text do the paperwork." |

 

*Practice out loud at least once before 8:30. Five minutes includes the demo. Backup recording mandatory.*

# **9 · Scoring maps**

## **Official judging rubric — 5 criteria, 1–5 points each**

| Criterion | Our answer |
| :---- | :---- |
| 1 · Defines a real problem | Unclaimed benefits are documented and dollar-quantified ($80B national; $7B EITC alone); the barrier is administrative burden, and it's growing (H.R. 1 requirements; 18,900 CT kids off SNAP this year). |
| 2 · Valuable user benefits | Dollar values on screen: a qualifying family of four can access $34–52k/year in combined benefits, plus time saved and the discounts eligibility unlocks. |
| 3 · Advantages over current solutions | Six named competitors and a clean claim: everyone else answers "what am I eligible for?" — we answer "get it for me." mRelief handled honestly. |
| 4 · Confidence-inspiring presentation | One persona, one story, real CT program names, real dollar figures, sourced stats. Keychain framing as the memorable line. |
| 5 · Strong prototype | One workflow end-to-end: conversation → inference → eligibility map → auto-filled form → language toggle. Depth over polish. |

 

## **Audience vote — 6 factors**

| Factor | Where we hit it |
| :---- | :---- |
| Importance & clarity of problem | The three-number opening; the How-might-we. |
| Quality & originality of solution | Answer-once-apply-everywhere \+ document generation \+ the keychain — the combination nobody ships. |
| Effective use of AI | The inference moment (beat 2); language detection; conversational elicitation replacing 200-question forms. |
| Evidence of user/market understanding | Maria persona; Stamford language data; smartphone-only stats; assisted-mode awareness; sourced research section. |
| Feasibility & potential impact | CT already texts clients and runs an AI lab — the buyer and channel are proven. Impact quantified in dollars. |
| Quality & clarity of presentation | Five-segment skeleton, rehearsed, backup recorded. |

# **10 · Success metrics (PM-owned, for the pitch's credibility)**

•      **North star:** dollars of benefits claimed per completed conversation.

•      **Intake:** conversation completion rate; time from first message to eligibility map (target: under 5 minutes — vs. \~1 hour legacy applications).

•      **Conversion:** % of users who start at least one application; % who submit with a generated document attached.

•      **Retention:** recertification completion rate for nudged users vs. baseline (the churn metric CT already tracks).

•      **Equity:** share of conversations in non-English languages; share via SMS vs. web.

# **11 · Who does what before the 19th**

| Role | Owns between now and event night |
| :---- | :---- |
| Product Manager | Lock scope to the six demo beats; write Maria's user stories; own the "out of scope" line when the team tries to add features. |
| Market Specialist | Own §4–5: verify the competitor grid, finalize the persona, confirm Stamford language/poverty figures for the deck. |
| Data Specialist | Verify current CT program names \+ rough thresholds (SNAP, HUSKY A/D, CT Energy Assistance, Care 4 Kids, CT EITC). Confirm Lifeline status and which carrier low-income plans are active (ACP defunded 2024 — do not name dead programs on stage). Source the dollar values shown on the eligibility map. |
| Developer | Build the web chat \+ eligibility map \+ one auto-filled form (static visual fed by conversation variables is fine). Script the inference moment so it fires reliably. Language toggle. Freeze by 7:45 on the night. |
| Presentation Specialist | Own §8. Get the keychain line, the three numbers, and the inference script this week — not at 8:15. Build the SMS mock frame. Record the backup demo. |
| Program Manager | Run the checklist below; book a slot at any remaining office hours / impromptu meetings; enforce the 7:45 freeze. |

 

## **Checklist**

•      Lock the How-might-we and Maria's details — everyone uses the same numbers.

•      Data Specialist verification pass on program names, thresholds, dollar values, Lifeline status.

•      Script the inference exchange and the keychain line; deliver to Presentation Specialist.

•      Build and test the six demo beats; freeze; record backup.

•      Rehearse the five minutes out loud at least once, timed, including the demo.

•      Watch for room numbers and arrival details.

*The AI Collective — Stamford · Build. Solve. Impact.*

\++++++  
Q: Primary research; look at other municipalities who do a great job of getting funds to underserved people who need them.  I'm in a hackathon and want to build a digital app that can serve that audience.  Find 5 municipalities that have done exemplary work with such social programs, search for awards, etc.

## **5 Award-Winning Municipalities & Exemplary Programs**

To solve benefit distribution friction, top cities focus on **unified profiles, predictive eligibility, automated document re-use, and pro-active notification triggers**.

Here are 5 municipalities recognized by awards (such as *TIME Best Inventions*, *Smart Cities Connect 50*, *IDC Smart Cities*, and *Code for America Innovator Awards*) for exemplary work in getting funds and social services into residents' hands.

### **1\. City of Seattle, WA – *Affordable Seattle (CiviForm)***

* **Awards:** Named one of *TIME’s Best Inventions* (2025), *Smart Cities Connect 50* Award, and *Anthem Silver Award*.

* **The Breakthrough:** Built **CiviForm** (an open-source project created with Google.org) to unite disparate city programs—from utility rate relief and childcare subsidies to housing assistance—under a single, reusable profile.

* **Key Innovations:**

  * **Unified Household Profile:** Residents enter income and household data once; the platform pre-fills applications across multiple departments.

  * **Drastic Time Reduction:** Reduced average application time from **30 minutes down to 5 minutes**, increasing accessibility for time-poor applicants.

  * **Trusted Intermediary Portal:** Allows trusted Community-Based Organizations (CBOs) and case managers to apply *on behalf* of clients securely during street outreach.

### **2\. City of Charlotte, NC – *Unified Housing & Social Services Hub***

* **Awards:** *IDC Smart Cities North America Award Finalist* (2026) and *National Digital Inclusion Trailblazer*.

* **The Breakthrough:** Overhauled fragmented, paper-based housing and community benefit programs into a streamlined one-stop digital portal.

* **Key Innovations:**

  * **Rapid Processing:** Cut application processing times from weeks down to **2–3 days**.

  * **Data Reuse Across Non-Profits:** Integrated city departments directly with community organizations like Habitat for Humanity to eliminate redundant paperwork verification.

### **3\. State of New Jersey (Office of Innovation) – *Eligibility & Access Engine***

* **Awards:** Recognized by *Code for America* and StateScoop for public-sector service design excellence.

* **The Breakthrough:** Created lightweight, plain-language screening engines and streamlined status checkers for safety-net benefits (Unemployment, SNAP, Temporary Disability, and Childcare).

* **Key Innovations:**

  * **Micro-Eligibility Screeners:** Replaced complex 40-page application rules with interactive, 2-minute decision trees that calculate likelihood of approval before full application.

  * **Proactive Status Transparency:** Built self-service tracking tools that reduced inbound call center volume while demystifying approval timelines.

### **4\. City of Bloomington, IN – *Open-Source Civic Benefit Portal***

* **Awards:** *Exygy Open Source Public Sector Innovation* Showcase.

* **The Breakthrough:** Adapted open-source infrastructure (CiviForm) specifically for small-to-midsize municipalities with tight IT budgets to run municipal relief and housing support.

* **Key Innovations:**

  * **Zero-Redundancy Document Vault:** Residents can re-use uploaded tax forms (SSA-1099, W-2) and proof of residency across multiple annual grant applications.

  * **Multilingual UI & Off-Line Capability:** Built explicitly for mobile devices with automatic translations to lower barriers for non-English speakers.

### **5\. City of San José, CA – *Equity-First 311 & Digital Inclusion Access***

* **Awards:** *Bloomberg Philanthropies What Works Cities Gold Certification*, *Digital Cities Award \#1*.

* **The Breakthrough:** Integrated benefit access and relief programs directly into its 311/digital constituent workflow with a core focus on equity and language accessibility.

* **Key Innovations:**

  * **Language & Channel Flexibility:** Allowed residents to apply or check eligibility over SMS, web, or assisted phone calls in multiple languages.

  * **Targeted Algorithmic Outreach:** Leveraged municipal utility and tax data to proactively message low-income households about subsidies they qualified for *before* deadlines passed.

## **Mapping Your Hackathon Product to the Friction Points**

To address the specific barriers you identified (CEAP document burden, waitlist lotteries, income calculation edge-cases, and work requirement tracking), your product architecture can target three key areas:  
\+-----------------------------------------------------------------------------------+  
|                            HACKATHON PRODUCT FRAMEWORK                            |  
\+--------------------------+------------------------------+-------------------------+  
|     FRICTION POINT       |      MUNICIPAL SOLUTION       |  YOUR HACKATHON MVP FEATURE |  
\+--------------------------+------------------------------+-------------------------+  
| Complex Eligibility &    | Pre-screener Rules Engine    | Dynamic "Benefit Screener"|  
| SS/Non-Taxable Income    | (New Jersey)                 | with automatic income   |  
| Disqualifiers            |                              | threshold calculation.  |  
\+--------------------------+------------------------------+-------------------------+  
| Unpredictable Housing    | Automated Waitlist Monitors  | SMS / Webhook Watchdog  |  
| Waitlist Openings        | & Notifications              | alerting users when     |  
| (Stamford Section 8\)     | (Seattle CiviForm)           | narrow windows open.    |  
\+--------------------------+------------------------------+-------------------------+  
| Document Burden &        | Reusable Document Locker /   | Document Vault with AI  |  
| Work-Requirement Churn   | Auto-fill (Charlotte/    | OCR to extract W-2/1099 |  
| (SNAP/HUSKY 80hr rule)   | Bloomington)                 | data & track hours.     |  
\+--------------------------+------------------------------+-------------------------+

Q: Does Stamford have such an application?

**No, Stamford currently does not have a unified, cross-program digital benefit portal like Seattle’s CiviForm or New Jersey’s integrated screener.**

Instead, Stamford relies on a **highly fragmented digital landscape** split across state platforms, individual municipal PDFs, and non-profit websites.

### **Stamford’s Current Digital Reality**

| Benefit Category | Current Digital Delivery Method | The Friction / Gap |
| :---- | :---- | :---- |
| **State-Administered**  *(SNAP, HUSKY/Medicaid, CEAP)*  | Administered via Connecticut’s statewide portals (**ConneCT** & **MyDSS**). | **Siloed Systems:** Separate from municipal programs. High documentation friction, complex work-tracking mandates, and no unified application across state \+ city relief. |
| **City-Administered Relief**  *(Renters’ Rebate, Senior/Disabled Tax Relief)*  | Managed via the City of Stamford Health & Human Services website. | **Paper & PDFs:** Applications are predominantly static PDFs or video walkthroughs uploaded to the city website. Inconsistently integrated with online submission forms. |
| **Housing Authority**  *(Charter Oak Communities)*  | Managed on an independent housing management portal. | **Unpredictable Access:** Static waitlist status pages with zero proactive alerts when narrow lottery windows open (e.g., flash 100-application windows). |
| **Local Food & Emergency Relief**  *(Person-to-Person, Food Collaborative)*  | PDF guides (e.g., "A Guide to Accessing Food in Stamford") updated periodically. | **Static Information:** Relies on manual PDF downloads that quickly become outdated when mobile pantries change schedules, locations, or intake criteria. |

### **What This Means for Your Hackathon Product**

Stamford’s lack of an integrated system makes it an **ideal target candidate** for your hackathon pitch. You can position your product as a **civic open-source bridge** tailored for cities like Stamford that haven't built or bought enterprise civic tech yet.

#### **Winning Pitch Angle:**

*"State portals cover state benefits, and cities distribute local grants, but residents live in one household. Our tool acts as the missing unified layer for Stamford—reducing application re-entry, tracking work hours, and monitoring closed waitlists automatically."*

Here is a full technical prototype architecture for **BridgeStamford**—a lightweight, hackathon-ready MVP designed to bridge Stamford’s fragmented local, state, and non-profit benefit ecosystems.

## **1\. System Architecture Overview**

                         ┌────────────────────────┐  
                          │   REACT / NEXT.JS WEBP  │  
                          │   PWA (Mobile-First)   │  
                          └───────────┬────────────┘  
                                      │ REST / WebSocket  
                                      ▼  
┌────────────────────────────────────────────────────────────────────────┐  
│                        NODE.JS / EXPRESS BACKEND API                   │  
├──────────────────────┬──────────────────────┬──────────────────────────┤  
│  1\. Income Rules Engine│  2\. Webhook / Poller  │ 3\. Document AI Pipeline  │  
│  \- CT Median Income  │  \- Charter Oak Scraper│  \- Tesseract.js / Claude │  
│  \- Tax-Exempt SSA-1099│  \- Food Schedule RSS │  \- SSA-1099 & Paystubs   │  
└──────────┬───────────┴──────────┬───────────┴────────────┬─────────────┘  
           │                      │                        │  
           ▼                      ▼                        ▼  
┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐  
│ SUPABASE / PGSQL │    │   TWILIO / SMS   │    │ CONNECTICUT DSS /  │  
│ \- Encrypted Vault│    │  \- Flash Alerts  │    │ MYDSS PRE-SCREENER │  
│ \- User Profiles  │    │  \- Work-Hr Remind│    │ (Calculated API)   │  
└──────────────────┘    └──────────────────┘    └────────────────────┘

## **2\. Core Functional Modules (The 3 Pillar Features)**

### **Pillar A: Dynamic CT Income & Work-Requirement Engine**

* **The Problem:** Connecticut counts non-taxable income (Social Security) toward Stamford property tax relief limits, and HUSKY/SNAP requires tracking **80 hours/month** of work activity.

* **The Tech Solution:**

  * A client-side JavaScript state machine evaluating household income against local/state caps:

    $$\\text{CT Adjusted Household Income} \= \\text{AGI} \+ \\text{Non-Taxable SS} \+ \\text{Tax-Exempt Interest}$$  
  * A lightweight dashboard where users log/upload bi-weekly work/training hours to prevent HUSKY D / SNAP coverage drops.

### **Pillar B: Stamford Emergency Watchdog (Web Scraper & Poller)**

* **The Problem:** Charter Oak Communities (Stamford Housing) opens Section 8 and project-based waitlists unpredictably for tiny windows (e.g., 100 applications).

* **The Tech Solution:**

  * **Cron Service:** Node.js script using Puppeteer / Cheerio running every 15 minutes targeting Charter Oak and city alert pages.

  * **Alert Pipeline:** Triggers immediate SMS broadcasts via **Twilio API** to registered users when waitlist status text flips from "Closed" to "Open".

### **Pillar C: "Zero-Reentry" Document Vault (OCR)**

* **The Problem:** CEAP, Renters' Rebate, and SNAP require uploading the same SSA-1099, W-2, and utility bills repeatedly.

* **The Tech Solution:**

  * Client-side scan using **Tesseract.js** or **Claude Vision API** to extract Gross Income, SSA Benefit Amounts, and Address details.

  * Extracted values automatically pre-fill standardized JSON application payloads for CEAP and Stamford municipal PDF forms.

## **3\. Recommended Tech Stack for a 24-48 Hour Hackathon**

| Component | Technology Choice | Why Choice Fits Hackathon Scope |
| :---- | :---- | :---- |
| **Frontend UI** | **Next.js (React) \+ TailwindCSS** | Rapid styling, SSR for mobile devices, easily deployed on Vercel. |
| **Database & Auth** | **Supabase (PostgreSQL)** | Instant Auth, Row-Level Security (RLS) for privacy, built-in REST/GraphQL. |
| **Document OCR** | **Tesseract.js** or **Claude Vision API** | Optical Character Recognition directly in browser/Node without setup. |
| **Scraper / Poller** | **Puppeteer \+ Node-Cron** | Reliable headless browser to monitor Stamford housing HTML updates. |
| **Notifications** | **Twilio Messaging API** | High deliverability SMS alerts for immediate waitlist openings. |

## **4\. Hackathon MVP Data Flow & Schema**

### **Sample Database Schema (Supabase / Postgres)**

SQL  
\-- Household Profile (Shared across CEAP, SNAP, Tax Relief)  
CREATE TABLE household\_profiles (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  phone\_number VARCHAR(15) UNIQUE NOT NULL,  
  zip\_code VARCHAR(5) DEFAULT '06902',  
  household\_size INT NOT NULL,  
  gross\_annual\_income NUMERIC(10,2) NOT NULL,  
  social\_security\_income NUMERIC(10,2) DEFAULT 0.00,  
  is\_senior\_or\_disabled BOOLEAN DEFAULT FALSE,  
  monthly\_work\_hours INT DEFAULT 0 \-- For SNAP/HUSKY 80-hr tracking  
);

\-- Active Alerts Watchdog Queue  
CREATE TABLE housing\_watchdog (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  property\_name VARCHAR(100), \-- e.g., 'Charter Oak Section 8', 'NV @ Harbor Point'  
  last\_status VARCHAR(50),   \-- 'CLOSED', 'OPEN'  
  target\_url TEXT NOT NULL,  
  last\_checked\_at TIMESTAMP DEFAULT NOW()  
);

## **5\. Live Pitch & Prototype Demonstration Script**

To present this successfully to hackathon judges:

1. **Step 1: The Stamford Reality (30 sec)**

   *Show a slide with 4 open tabs:* State MyDSS, City Renters' Rebate PDF, Stamford Food Collaborative PDF, and Charter Oak Housing portal. *"A single low-income Stamford resident has to navigate 4 separate silos and resubmit the exact same SSA-1099 form 3 times."*

2. **Step 2: The Screener Demo (45 sec)**

   *Run the live app:* Input $45,000 income \+ $10,000 Social Security. Show how the engine automatically warns the user about Stamford's property tax relief non-taxable income inclusion, while instantly matching them for CEAP energy assistance ($295–$645).

3. **Step 3: The Waitlist Alert (45 sec)**

   *Simulate a scraper trigger:* Manually toggle the Charter Oak Section 8 status from "Closed" to "Open" in your backend database. Show a live SMS hitting a real phone: *"ALERT: Charter Oak Section 8 Waitlist is OPEN. Click here to apply."*

