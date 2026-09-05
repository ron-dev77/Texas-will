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
- `src/lib/beneficiary-designation.ts` — IRA brackets + scaled ERISA (Scott placeholders)
- `src/pages/Questionnaire.tsx` — ERISA callout; couples bidirectional spousal note
- `supabase/functions/questionnaire/index.ts` — returns qualifier snapshot in draft meta

### Spousal trust documents
- `src/lib/spousal-trust.ts` — **Scott verbatim** Option 1 & 2; couples bidirectional review helper
- `src/lib/content-defaults/default-spousal-trust-skeleton.ts` — admin skeleton (Option 1 default)
- `src/lib/will-content.ts` — residuary pour-over + trust article when `includeSpousalTrust`
- Questionnaire **Spousal testamentary trust** — sole vs co-trustee (`spousal_trust_trustee_mode`)

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
| ERISA full-note threshold | $250k+ |
| Over-$8M referral list | Email capture only |
| Ethics review | Required before live |

## Deploy checklist

1. Run migration `20260904000000_phase2_qualifier_leads.sql`
2. Set `STRIPE_PRICE_SPOUSAL_TRUST` secret (optional but recommended)
3. Deploy edge functions: `checkout`, `questionnaire`
4. Merge `feature/phase2-spousal-trust-qualifier` when approved
