/**
 * Default AI prompts used to draft a Texas will. The admin Content editor can
 * override these in the database (table `content_prompt_versions`); when no
 * active row exists we fall back to these strings so generation never breaks.
 *
 * The user-prompt template uses placeholders that the generator replaces:
 *   {{answers_json}}   — JSON-stringified questionnaire answers
 */

export const DEFAULT_SYSTEM_PROMPT = `You are a Texas estates attorney drafting a Last Will and Testament. Follow the skeleton exactly. No markdown, no placeholders.

SKELETON:
"""{{skeleton}}"""`;

const SIGNATURE_LINE = "__________________________________________________";

export const DEFAULT_USER_PROMPT_TEMPLATE = `QUESTIONNAIRE ANSWERS:
{{answers_json}}

Return ONLY a valid JSON object matching this TypeScript type, with no markdown fences or commentary:
{ "title": string, "testatorName": string, "sections": Array<{ "heading": string, "paragraphs": string[] }> }

Requirements:
- The sections array must include Articles I–X (or the applicable subset), followed by the four execution-block sections below, in this exact order and with these exact headings.
- Each blank signature/printed-name/address line must be its own entry in the paragraphs array so it renders on its own line. Use exactly this underscore string for every blank line: "${SIGNATURE_LINE}".
- Never invent names, dates, counties, or witness identities — leave them as blank underscore lines to be filled in at execution.

The final four sections MUST be:

1) Heading: "SIGNATURE OF TESTATOR"
   Paragraphs (in order):
     - The full attestation paragraph beginning "I, [testator full legal name], the Testator, sign my name to this instrument, this ______ day of __________________, 20_____, and being first duly sworn..." (use the actual testator name from the answers).
     - "${SIGNATURE_LINE}"
     - "Signature of Testator"
     - "${SIGNATURE_LINE}"
     - "Printed Name"

2) Heading: "WITNESSES"
   Paragraphs (in order):
     - The full witness attestation paragraph ("We, the undersigned witnesses...").
     - "IMPORTANT: Neither witness may be a beneficiary named in this Will. Both witnesses must be present at the same time when the Testator signs."
     - "${SIGNATURE_LINE}"
     - "Signature of Witness 1"
     - "${SIGNATURE_LINE}"
     - "Printed Name"
     - "${SIGNATURE_LINE}"
     - "Address"
     - "${SIGNATURE_LINE}"
     - "Signature of Witness 2"
     - "${SIGNATURE_LINE}"
     - "Printed Name"
     - "${SIGNATURE_LINE}"
     - "Address"

3) Heading: "SELF-PROVING AFFIDAVIT"
   Paragraphs (in order):
      - "(Texas Estates Code Section 251.104)"
     - "STATE OF TEXAS"
     - "COUNTY OF ____________________________"
     - The full self-proving affidavit paragraph beginning "Before me, the undersigned authority, on this day personally appeared..." naming the testator and referencing the two witnesses.
     - "${SIGNATURE_LINE}"
     - "Signature of Testator"
     - "${SIGNATURE_LINE}"
     - "Signature of Witness 1"
     - "${SIGNATURE_LINE}"
     - "Signature of Witness 2"

4) Heading: "NOTARY ACKNOWLEDGMENT"
   Paragraphs (in order):
     - "Subscribed and sworn to before me by the said __________________, Testator, and by the said __________________ and __________________, witnesses, this ______ day of __________________, 20_____."
     - "${SIGNATURE_LINE}"
     - "Notary Public, State of Texas"
     - "${SIGNATURE_LINE}"
     - "My Commission Expires"
     - "[NOTARY SEAL]"`;
