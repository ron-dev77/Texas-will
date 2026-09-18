# Phase 2 — Pre-qualifier, spousal trust, estate off-ramp

Draft environment documentation. Not live to customers until ethics review.

## User flow (UI routes)

| Step | Route | What the customer sees |
|------|-------|------------------------|
| 1 | `/qualify` | Plan type (Individual / Couples) — **locked after this step** |
| 2 | `/qualify` | Marital status |
| 3 | `/qualify` | Prior-relationship children (Couples: whose children — me / partner / both) |
| 4 | `/qualify?step=blended` | **Blended-family screen** (only if married/partnered + prior kids = Yes) |
| 5 | `/qualify` | Estate size (4 brackets; Over $8M → off-ramp) |
| 6 | `/qualify/off-ramp` | Over-$8M hard stop + optional email capture |
| 7 | `/summary` | Locked plan, spousal trust row, estate bracket, price, link to checkout |
| 8 | `/pricing#checkout` | Document pick, RLT add-on (+$50), email, pay (plan **not** editable) |
| 9 | `/questionnaire` | Prefilled marital + prior-kids; spousal trust section if purchased |

**Marketing:** Home (`/`) is always the marketing site. If the qualifier is already complete, the hero button says **Continue to checkout** and links to `/summary`.

**Summary “Change”** on spousal trust → `/qualify?step=blended` (Screen 1B only).

## Code locations

### Pre-qualifier
- `src/lib/qualifier.ts` — types, localStorage, validation, `qualifyStepsForDraft`
- `src/pages/Qualify.tsx` — multi-step wizard + `?step=blended` deep link
- `src/pages/QualifyOffRamp.tsx` — Over $8M screen
- `src/pages/Summary.tsx` — bridge before checkout
- `src/pages/Home.tsx` — redirects to `/summary` when qualifier complete

### Pricing & checkout
- `src/lib/pricing.ts` — `SPOUSAL_TRUST_ADDON_CENTS` ($400 placeholder), RLT $50
- `src/lib/order.ts` — `QualifierSnapshot` on order draft
- `src/pages/Pricing.tsx` — reads qualifier; locks plan; RLT optional add-on
- `src/lib/checkout.ts` — passes qualifier + spousal trust to edge function
- `supabase/functions/checkout/index.ts` — Stripe line items, $8M server reject
- `supabase/functions/_shared/pricing.ts` — server pricing + `STRIPE_PRICE_SPOUSAL_TRUST`

### Questionnaire
- `src/lib/questionnaire.ts` — prior-kids; spousal trust section; beneficiary designation
- `src/lib/beneficiary-designation.ts` — IRA brackets + brief ERISA reminder (married + prior kids)
- `src/lib/special-needs-trust.ts` — multi-beneficiary SNT rows; PDF article per child
- `src/pages/Questionnaire.tsx` — ERISA callout; couples bidirectional spousal note; field validation on change
- `supabase/functions/questionnaire/index.ts` — returns qualifier snapshot in draft meta

#### Step 9 — Beneficiary designation (Ron, Sep 2026)
- **Questions unchanged** (asset bracket pills, forms reviewed, update plan).
- **Validation:** “This field is required” clears immediately after pill / Yes-No selection.
- **Yellow callout** (`ErisaSpousalNote`): shows when married/partnered + prior-relationship kids + asset bracket is **$50k–$250k** or **$250k+**. Always the brief **“Beneficiary forms reminder”** copy (not a longer tier at $250k+).

#### Step 10 — Special needs trust (Ron, Sep 2026)
- **Intro:** removed *“A licensed Texas attorney must read and approve this language…”* (attorney approves workflow/language separately).
- **Beneficiaries:** repeatable `snt_trusts` cards — **Add another beneficiary** (one testamentary SNT article per row in PDF).
- **Remainder Q&A:** Scott copy for primary + contingent remainder; **Use a name from earlier steps** on both fields.
- **Existing trust:** removed yes/no + name/date questions; replaced with static info box **“A note on existing special needs trusts”** (grandparent trust OK; My AI Will creates its own independent trust). No pour-over clause in PDF from old answers.

#### Steps 1, 11–15 — Validation (Ron, Sep 2026)
- Re-validate on every answer change; no stale blur on pills; person-picker + date fields use latest value so errors clear after valid input.

### Spousal trust documents
- `src/lib/spousal-trust.ts` — **Scott verbatim** Option 1 & 2; couples bidirectional review helper
- `src/lib/spousal-residuary-article-v.ts` — Ron 9/13/26 **Article V (5.1–5.6)** in the Will; opening paragraph; Article III debts/taxes; SNT pour-over in 5.2 and 5.4(d)
- `src/lib/content-defaults/default-spousal-trust-skeleton.ts` — admin skeleton (Option 1 default)
- `src/lib/content-defaults/default-will-skeleton.ts` — title `LAST WILL OF {{legal_full_name}}`; Art III Ron; **Art V charitable** (`{{clause_charitable}}`); **Art VI residuary** (Ron Article V when spousal trust)
- `src/lib/skeleton-clauses.ts` — wires Ron clauses; no duplicate `residuarySpecialNeedsNote` on spousal Article V
- `src/lib/will-content.ts` — legacy PDF path aligned with Ron Article V when `includeSpousalTrust`
- Questionnaire **Spousal testamentary trust** — sole vs co-trustee (`spousal_trust_trustee_mode`)
- **Step 8 redesign (MVP):** residuary Q1 = 3 options (no bare spouse-only); Q2 `children_residuary_delivery` outright vs lifetime trust + education; PDF uses Module O (`CHILDREN_OUTRIGHT_RESIDUARY_PHRASE`) or Article VI children trust per Q2; legacy `spouse_only` → `spouse_then_children` on load
- **Will PDF:** default skeleton drops PREAMBLE heading; skeleton PDF white pages + centered page numbers; SNT articles use Roman numerals, full-name trust title, Ron §9 termination text

#### Step 8 — Children’s lifetime residuary trust (MVP + Rev 1, Sep 2026)
- **Questionnaire** (`residuary` section): when plan is **Equally among my children** or **spouse then children** and **has children**, shows MVP info copy, **SNT override** note when special needs is enabled, and required **primary / alternate adult trustee** (person picker). **Custom residuary split** removed from UI.
- **Will PDF:** **Article VI — Trust for Children** (**6.1–6.6**, Ron Rev 3 spousal handoff). **5.4(d)** termination uses principal/undistributed income + explicit Article VI trustee pour-over; margins 1″; page numbers exclude self-proving affidavit only.
- Template: [`src/lib/children-residuary-trust-article.ts`](src/lib/children-residuary-trust-article.ts) — fixed text, no AI generation.
- **No DB migration** — legacy `residuary_plan: custom` answers still render if already saved.

#### Will skeleton — Ron 9/13/26 (Will Edits doc)
- **Q6/Q7 copy:** specific and charitable gifts use item or dollar amount — not a percentage of residuary.
- **Admin preview:** Last Will tab shows charitable article, Ron Art III, and unified spousal residuary (5.1–5.6). Separate **Spousal Testamentary Trust** admin tab unchanged (7 document pickers).

**Couples + both have prior kids:** Each partner fills their own questionnaire; admin shows **“Couples spousal trust — review both”** badge. Not auto-generated as a pair — attorney must verify both wills.

### Execution block validation
- `src/lib/skeleton-execution.ts` — will save/bucket **fails loudly** if SIGNATURE OF TESTATOR, WITNESSES, notary/affidavit, or signature lines are missing from layout
- Used in `OrderLayoutsTab` save + bucket, `OrderDocumentReview` save

### Admin
- `src/pages/admin/OrderDetail.tsx` — estate bracket, spousal trust, couples-review badges
- `scripts/grant-admin.mjs` — create/confirm/grant admin users (service role)

### Database
- `supabase/migrations/20260904000000_phase2_qualifier_leads.sql` — off-ramp email capture

## Stripe env (separate line item for spousal trust)

Set on Supabase Edge Function secrets (see `.env.example`):

```
STRIPE_PRICE_SPOUSAL_TRUST=price_…
```

Checkout adds this price ID when `includeSpousalTrust` is true. Total always includes $400 via `SPOUSAL_TRUST_ADDON_CENTS` even if the price ID is missing.

## Open decisions (Scott / product)

| Item | Current placeholder |
|------|---------------------|
| Base price | $249 individual / $399 couples |
| Spousal trust price | $400 (testing only) |
| IRA value brackets | under $50k / $50k–$250k / $250k+ |
| ERISA Step 9 callout | Brief reminder only ($50k+ tiers; married + prior kids) |
| Over-$8M referral list | Email capture only |
| Ethics review | Required before live |

## Deploy checklist

1. Run migration `20260904000000_phase2_qualifier_leads.sql`
2. Set `STRIPE_PRICE_SPOUSAL_TRUST` secret (optional but recommended)
3. Deploy edge functions: `checkout`, `questionnaire`
4. Merge `feature/phase2-spousal-trust-qualifier` when approved
