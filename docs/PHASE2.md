# Phase 2 — Pre-qualifier, spousal trust, estate off-ramp

Draft environment documentation. Not live to customers until ethics review.

## User flow (UI routes)

| Step | Route | What the customer sees |
|------|-------|------------------------|
| 1 | `/qualify` | Plan type (Individual / Couples) — **locked after this step** |
| 2 | `/qualify` | Marital status |
| 3 | `/qualify` | Prior-relationship children (Couples: whose children — me / partner / both) |
| 4 | `/qualify` | **Blended-family screen** (only if married/partnered + prior kids = Yes) |
| 5 | `/qualify` | Estate size (4 brackets; Over $8M → off-ramp) |
| 6 | `/qualify/off-ramp` | Over-$8M hard stop + optional email capture |
| 7 | `/summary` | Locked plan, spousal trust row, estate bracket, price, link to checkout |
| 8 | `/pricing#checkout` | Document pick, RLT add-on (+$50), email, pay (plan **not** editable) |
| 9 | `/questionnaire` | Prefilled marital + prior-kids; spousal trust section if purchased |

**Marketing CTAs** should link to `/qualify` instead of `/pricing` for new Phase 2 flow.

## Code locations

### Pre-qualifier
- `src/lib/qualifier.ts` — types, localStorage, validation, questionnaire prefills
- `src/pages/Qualify.tsx` — multi-step wizard
- `src/pages/QualifyOffRamp.tsx` — Over $8M screen
- `src/pages/Summary.tsx` — bridge before checkout

### Pricing & checkout
- `src/lib/pricing.ts` — `SPOUSAL_TRUST_ADDON_CENTS` ($400 placeholder), RLT $50
- `src/lib/order.ts` — `QualifierSnapshot` on order draft
- `src/pages/Pricing.tsx` — reads qualifier; locks plan; RLT optional add-on
- `src/lib/checkout.ts` — passes qualifier + spousal trust to edge function
- `supabase/functions/checkout/index.ts` — Stripe line items, $8M server reject
- `supabase/functions/_shared/pricing.ts` — server pricing

### Questionnaire
- `src/lib/questionnaire.ts` — prior-kids in **children** section; **spousal trust** section; final wishes required
- `src/lib/beneficiary-designation.ts` — IRA brackets + scaled ERISA (Scott placeholders)
- `src/pages/Questionnaire.tsx` — ERISA callout; prefills from order
- `supabase/functions/questionnaire/index.ts` — returns qualifier snapshot in draft meta

### Spousal trust documents
- `src/lib/spousal-trust.ts` — **Scott verbatim** Article X, Option 1 (sole trustee) and Option 2 (co-trustee); not AI-generated
- `src/lib/content-defaults/default-spousal-trust-skeleton.ts` — admin skeleton template (Option 1 default)
- `src/lib/will-content.ts` — residuary pour-over + trust article in will when `includeSpousalTrust`
- Questionnaire **Spousal testamentary trust** section chooses sole vs co-trustee (`spousal_trust_trustee_mode`)

**Open:** Couples orders where both spouses have prior-relationship children — each will may need opposite-direction trust language; not auto-handled yet.

### Admin
- `src/pages/admin/OrderDetail.tsx` — estate bracket + spousal trust badges

### Database
- `supabase/migrations/20260904000000_phase2_qualifier_leads.sql` — off-ramp email capture

## Open decisions (Scott / product)

| Item | Current placeholder |
|------|---------------------|
| Base price | $249 individual / $399 couples |
| Spousal trust price | $400 (testing only) |
| IRA value brackets | under $50k / $50k–$250k / $250k+ |
| ERISA full-note threshold | $250k+ |
| Over-$8M referral list | Not shown — email capture only |
| Spousal trust trustee default | Option 1 (spouse sole trustee); co-trustee chosen in questionnaire |
| Ethics review | Required before live |

## Explicitly not changed on live site

Production `/pricing` without qualifier redirect is unchanged until deploy. Phase 2 routes are additive in this branch.
