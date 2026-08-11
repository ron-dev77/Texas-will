import { LegalPage } from '@/components/site/LegalPage'

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="May 2026"
      summary="Your trust matters more than your data. This policy explains what we collect, how we use it, and the choices you have."
      activePath="/privacy"
      sections={[
        {
          id: 'collect',
          title: 'What we collect',
          body: (
            <p>
              The information you give us during checkout and the questionnaire (name, contact info,
              family and asset information), payment metadata from our payment processor (we never
              see your card number), and basic analytics (page views, device type) for improving the
              service.
            </p>
          ),
        },
        {
          id: 'use',
          title: 'How we use it',
          body: (
            <p>
              To draft your will, route it for attorney review, deliver it to you, and provide
              support. We do not sell your data. We do not use your questionnaire answers to train
              any AI model outside the scope of generating your own document.
            </p>
          ),
        },
        {
          id: 'storage',
          title: 'Where it lives',
          body: (
            <p>
              Your data is stored encrypted at rest in a U.S.-based managed database. Only the
              reviewing attorney and authorized support staff can access your file, and only as
              needed to deliver the service.
            </p>
          ),
        },
        {
          id: 'choices',
          title: 'Your choices',
          body: (
            <p>
              You can request a copy of your data or its deletion at any time by emailing
              scott@myaiwill.com. We may retain limited records to comply with tax and legal
              obligations.
            </p>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies',
          body: (
            <p>
              We use a small number of cookies for session management and analytics. We do not use
              third-party advertising cookies.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: <p>Questions about privacy? Email scott@myaiwill.com.</p>,
        },
      ]}
    />
  )
}
