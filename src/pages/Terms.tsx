import { LegalPage } from '@/components/site/LegalPage'

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="May 2026"
      summary="These Terms govern your use of the My AI Will website and software service (the “Service”). By using the Service you agree to these Terms."
      activePath="/terms"
      sections={[
        {
          id: 'what-we-provide',
          title: 'What we provide',
          body: (
            <p>
              My AI Will is a software service that generates a draft Texas will from your answers
              and arranges for a licensed Texas attorney to review the draft. My AI Will is{' '}
              <strong>not a law firm</strong> and does not provide legal advice. Use of the Service
              does not create an attorney-client relationship between you and My AI Will.
            </p>
          ),
        },
        {
          id: 'responsibilities',
          title: 'Your responsibilities',
          body: (
            <p>
              You must be at least 18 years old and a Texas resident, of sound mind, and provide
              accurate information. You are responsible for properly signing and witnessing your
              will in accordance with the Texas Estates Code and the instructions we provide.
            </p>
          ),
        },
        {
          id: 'payment',
          title: 'Payment and refunds',
          body: (
            <p>
              Pricing is shown at checkout in U.S. dollars. Because every order triggers attorney
              time, all sales are final once payment is processed. If you have not yet started the
              questionnaire and need to cancel, contact us and we will do our best to help.
            </p>
          ),
        },
        {
          id: 'liability',
          title: 'Limitation of liability',
          body: (
            <p>
              The Service is provided “as is.” To the maximum extent permitted by law, My AI Will's
              total liability arising out of or relating to the Service is limited to the amount you
              paid for the order at issue.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes',
          body: (
            <p>
              We may update these Terms from time to time. Continued use of the Service after an
              update constitutes acceptance of the updated Terms.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: <p>Questions about these Terms? Email scott@myaiwill.com.</p>,
        },
      ]}
    />
  )
}
