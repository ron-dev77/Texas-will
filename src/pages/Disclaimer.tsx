import { LegalPage } from '@/components/site/LegalPage'

export default function Disclaimer() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Legal Disclaimer"
      updated="May 2026"
      summary="My AI Will is not a law firm. We are a software service that produces a Texas-compliant will template reviewed by a licensed Texas attorney."
      activePath="/disclaimer"
      sections={[
        {
          id: 'not-a-law-firm',
          title: 'Not a law firm',
          body: (
            <p>
              <strong>My AI Will is not a law firm.</strong> We are a software service that produces
              a Texas-compliant Last Will and Testament template from your answers. Every draft is
              reviewed by a licensed Texas attorney before delivery.
            </p>
          ),
        },
        {
          id: 'no-attorney-client',
          title: 'No attorney-client relationship with My AI Will',
          body: (
            <p>
              Use of the Service does not create an attorney-client relationship between you and My
              AI Will. The communications you have with us through the website or the questionnaire
              are not protected by the attorney-client privilege.
            </p>
          ),
        },
        {
          id: 'not-legal-advice',
          title: 'Informational only — not legal advice',
          body: (
            <p>
              The information provided on this website and in the questionnaire is for general
              informational purposes only and does not constitute legal advice. If your situation
              involves complex family dynamics, multiple properties, a business interest, blended
              families, or significant estate-tax planning, you should consult with an attorney
              directly.
            </p>
          ),
        },
        {
          id: 'signing',
          title: 'Signing and validity in Texas',
          body: (
            <p>
              For a will to be legally valid in Texas, you must sign it according to the Texas
              Estates Code. We provide plain-English signing instructions with every delivered
              will, but the legal effectiveness of your will depends on your following those
              instructions correctly.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: <p>Questions? Email scott@myaiwill.com.</p>,
        },
      ]}
    />
  )
}
