import { useEffect, useMemo, useState } from 'react'
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createCheckoutIntent, finalizeCheckoutPayment } from '@/lib/checkout'
import type { PackageDocId, Plan } from '@/lib/order'

const publishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim()

let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!publishableKey) return Promise.resolve(null)
  if (!stripePromise) stripePromise = loadStripe(publishableKey)
  return stripePromise
}

type CheckoutDraft = {
  plan: Plan
  email: string
  partnerEmail?: string
  includeTrust: boolean
  documents: PackageDocId[]
  total: number
  lsrConsent: boolean
}

export type PaymentSuccessInfo = {
  orderId: string
  plan: Plan
  emailsSent: boolean
  expiresAt: string
  userEmail: string
  partnerEmail: string | null
  total: number
}

function PaymentForm({
  amountLabel,
  onSuccess,
  onError,
}: {
  amountLabel: string
  onSuccess: (paymentIntentId: string) => Promise<void>
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || busy) return
    setBusy(true)
    onError('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/pricing?paid=1`,
        },
      })

      if (error) {
        onError(error.message || 'Payment could not be completed.')
        setBusy(false)
        return
      }

      if (paymentIntent?.status === 'succeeded' && paymentIntent.id) {
        await onSuccess(paymentIntent.id)
        return
      }

      onError('Payment is still processing. Please wait a moment and try again.')
      setBusy(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !elements || busy}
        className="h-12 w-full gap-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" strokeWidth={1.75} />
            Pay {amountLabel}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Secured by Stripe. Card details never touch our servers.
      </p>
    </form>
  )
}

export function StripeCheckoutModal({
  open,
  draft,
  onClose,
  onPaid,
}: {
  open: boolean
  draft: CheckoutDraft | null
  onClose: () => void
  onPaid: (info: PaymentSuccessInfo) => void
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [booting, setBooting] = useState(false)

  useEffect(() => {
    if (!open || !draft) {
      setClientSecret(null)
      setBootError(null)
      setPayError(null)
      return
    }

    if (!publishableKey) {
      setBootError(
        'Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to .env.local and STRIPE_SECRET_KEY to Supabase secrets.',
      )
      return
    }

    let cancelled = false
    setBooting(true)
    setBootError(null)
    setPayError(null)
    setClientSecret(null)

    ;(async () => {
      try {
        const result = await createCheckoutIntent({
          plan: draft.plan,
          email: draft.email,
          partnerEmail: draft.partnerEmail,
          includeTrust: draft.includeTrust,
          documents: draft.documents,
          lsrConsent: draft.lsrConsent,
        })
        if (cancelled) return
        setClientSecret(result.clientSecret)
      } catch (err) {
        if (cancelled) return
        setBootError(err instanceof Error ? err.message : 'Could not start checkout')
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, draft])

  const options: StripeElementsOptions | undefined = useMemo(() => {
    if (!clientSecret) return undefined
    return {
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1c2438',
          colorBackground: '#ffffff',
          colorText: '#1c2438',
          colorDanger: '#b42318',
          borderRadius: '10px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
    }
  }, [clientSecret])

  const amountLabel = draft ? `$${draft.total}` : ''

  async function handleSuccess(paymentIntentId: string) {
    if (!draft) return
    const result = await finalizeCheckoutPayment(paymentIntentId)
    onPaid({
      orderId: result.orderId,
      plan: result.plan,
      emailsSent: result.emailsSent,
      expiresAt: result.expiresAt,
      userEmail: result.userEmail,
      partnerEmail: result.partnerEmail,
      total: draft.total,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Secure payment"
      description={
        draft
          ? draft.includeTrust
            ? `${draft.plan === 'couples' ? 'Couples' : 'Individual'} $${draft.plan === 'couples' ? 399 : 249} + Trust $50 = $${draft.total}`
            : `${draft.plan === 'couples' ? 'Couples' : 'Individual'} plan · $${draft.total}`
          : undefined
      }
      className="max-w-lg"
    >
      {!publishableKey || bootError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {bootError || 'Stripe publishable key missing.'}
        </p>
      ) : booting || !clientSecret || !options ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing secure checkout…
        </div>
      ) : (
        <Elements stripe={getStripe()} options={options}>
          {payError ? (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {payError}
            </p>
          ) : null}
          <PaymentForm
            amountLabel={amountLabel}
            onSuccess={handleSuccess}
            onError={setPayError}
          />
        </Elements>
      )}
    </Modal>
  )
}
