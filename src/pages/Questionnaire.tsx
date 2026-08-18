import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateField } from '@/components/ui/date-field'
import { PhoneField } from '@/components/ui/phone-field'
import { cn } from '@/lib/utils'
import { loadOrderDraft, type OrderDraft } from '@/lib/order'
import {
  ensureQuestionnaireSession,
  saveQuestionnaireAnswers,
  submitQuestionnaireToDb,
  type Answers,
  type QuestionnaireSession,
} from '@/lib/questionnaire-db'
import {
  fieldQualityError,
  formatAnswerPreview,
  getActiveSections,
  getVisibleFields,
  missingRequired,
  SECTIONS,
  type Field,
  type GiftRow,
  type PersonRow,
  type Section,
} from '@/lib/questionnaire'
import { getActiveQuestionnaireSchema } from '@/lib/admin-forms'

const STORAGE_KEY = 'myaiwill.questionnaire.v1'

const ROW_PAIRS: Record<string, string> = {
  date_of_birth: 'phone',
  address_city: 'address_county',
  spouse_full_name: 'marriage_date',
  primary_guardian_name: 'primary_guardian_relationship',
  alternate_guardian_name: 'guardian_notes',
  executor_name: 'executor_relationship',
  alt_executor_name: 'alt_executor_relationship',
  trust_successor_trustee_name: 'trust_successor_trustee_relationship',
}

function isComplex(field: Field) {
  return (
    field.type === 'longtext' ||
    field.type === 'radio' ||
    field.type === 'yesno' ||
    field.type === 'people' ||
    field.type === 'gifts' ||
    field.type === 'charitable_gifts'
  )
}

function groupFields(fields: readonly Field[]) {
  const rows: Field[][] = []
  const used = new Set<string>()

  for (const field of fields) {
    if (used.has(field.id)) continue
    const partnerId = ROW_PAIRS[field.id]
    const partner = partnerId ? fields.find((f) => f.id === partnerId) : undefined
    if (partner && !used.has(partner.id) && !isComplex(field)) {
      rows.push([field, partner])
      used.add(field.id)
      used.add(partner.id)
      continue
    }
    rows.push([field])
    used.add(field.id)
  }

  return rows.reduce<Field[][]>((acc, row) => {
    if (row.length === 1 && row[0].id === 'address_zip') {
      const last = acc[acc.length - 1]
      if (
        last &&
        last.some((f) => f.id === 'address_city' || f.id === 'address_county') &&
        last.length < 3
      ) {
        last.push(row[0])
        return acc
      }
    }
    acc.push(row)
    return acc
  }, [])
}

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Answers
  } catch {
    return {}
  }
}

function shortLabelFor(field: Field) {
  if (field.id === 'also_known_as') return 'Other names'
  if (field.id === 'legal_full_name') return 'Full legal name'
  if (field.id === 'date_of_birth') return 'Date of birth'
  if (field.id === 'phone') return 'Phone'
  return field.label.replace(/ \(optional\)$/i, '')
}

export default function Questionnaire() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const paymentIntentFromUrl = searchParams.get('payment_intent')
  const [sectionIdx, setSectionIdx] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [animKey, setAnimKey] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [order, setOrder] = useState<OrderDraft | null>(null)
  const [session, setSession] = useState<QuestionnaireSession | null>(null)
  const [formSections, setFormSections] = useState<Section[]>([...SECTIONS])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const sessionRef = useRef<QuestionnaireSession | null>(null)
  const skipNextSave = useRef(true)

  const activeSections = useMemo(
    () =>
      getActiveSections(
        Boolean(order?.includeTrust),
        formSections,
        order?.documents ?? ['will'],
      ),
    [order?.includeTrust, order?.documents, formSections],
  )
  const section = activeSections[Math.min(sectionIdx, activeSections.length - 1)] ?? activeSections[0]
  const totalSections = activeSections.length
  const isReview = Boolean(section?.isReview) || section?.id === 'review'
  useEffect(() => {
    if (sectionIdx >= activeSections.length) {
      setSectionIdx(Math.max(0, activeSections.length - 1))
    }
  }, [activeSections.length, sectionIdx])

  const visibleFields = useMemo(
    () => (section ? getVisibleFields(section, answers) : []),
    [section, answers],
  )
  const fieldRows = useMemo(() => groupFields(visibleFields), [visibleFields])
  const missing = useMemo(
    () => (section ? missingRequired(section, answers) : []),
    [section, answers],
  )
  const progressPct = Math.round(((sectionIdx + 1) / totalSections) * 100)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const draft = loadOrderDraft()
      const local = loadAnswers()
      setOrder(draft)
      try {
        const [schemaResult, result] = await Promise.all([
          getActiveQuestionnaireSchema(),
          ensureQuestionnaireSession(draft, local, tokenFromUrl, paymentIntentFromUrl),
        ])
        if (cancelled) return
        setFormSections(schemaResult.sections)
        sessionRef.current = result.session
        setSession(result.session)
        if (result.order) setOrder(result.order)
        setAnswers(result.answers)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.answers))
        setSubmitted(result.submitted)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        try {
          const schemaResult = await getActiveQuestionnaireSchema()
          if (!cancelled) setFormSections(schemaResult.sections)
        } catch {
          /* keep bundled SECTIONS */
        }
        setBootError(err instanceof Error ? err.message : 'Could not start questionnaire')
        setAnswers(local)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tokenFromUrl, paymentIntentFromUrl])

  // Keep Yes → at least one empty row for list fields
  useEffect(() => {
    setAnswers((prev) => {
      let changed = false
      const next = { ...prev }
      if (prev.has_children === 'yes' && (!Array.isArray(prev.children) || prev.children.length === 0)) {
        next.children = [{ name: '', date_of_birth: '' }]
        changed = true
      }
      if (
        prev.has_specific_gifts === 'yes' &&
        (!Array.isArray(prev.specific_gifts) || prev.specific_gifts.length === 0)
      ) {
        next.specific_gifts = [{ item: '', recipient: '' }]
        changed = true
      }
      if (
        prev.has_charitable_gifts === 'yes' &&
        (!Array.isArray(prev.charitable_gifts) || prev.charitable_gifts.length === 0)
      ) {
        next.charitable_gifts = [{ item: '', recipient: '' }]
        changed = true
      }
      return changed ? next : prev
    })
  }, [
    answers.has_children,
    answers.has_specific_gifts,
    answers.has_charitable_gifts,
  ])

  // Local mirror + debounced DB save
  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const active = sessionRef.current
    if (!active || Object.keys(answers).length === 0) return

    const t = window.setTimeout(() => {
      void saveQuestionnaireAnswers({
        session: active,
        answers,
        currentSection: sectionIdx + 1,
      })
        .then(() => {
          setSavedFlash(true)
          window.setTimeout(() => setSavedFlash(false), 1200)
        })
        .catch((err: unknown) => {
          console.error('Failed to save answers', err)
        })
    }, 700)

    return () => window.clearTimeout(t)
  }, [answers, ready, sectionIdx])

  function setFieldError(id: string, message: string | null) {
    setFieldErrors((prev) => {
      if (!message) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      if (prev[id] === message) return prev
      return { ...prev, [id]: message }
    })
  }

  function validateField(field: Field, value: unknown, markTouched = false) {
    if (markTouched) setTouched((t) => ({ ...t, [field.id]: true }))
    const msg = fieldQualityError(field, value)
    setFieldError(field.id, msg)
    return msg
  }

  function update(id: string, value: unknown) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value }
      if (id === 'has_children' && value === 'yes') {
        const existing = prev.children
        const hasRow =
          Array.isArray(existing) &&
          existing.length > 0 &&
          existing.some(
            (r) =>
              r &&
              typeof r === 'object' &&
              ('name' in r || 'date_of_birth' in r),
          )
        if (!hasRow) {
          next.children = [{ name: '', date_of_birth: '' }]
        }
      }
      if (id === 'has_children' && value === 'no') {
        delete next.children
        delete next.primary_guardian_name
        delete next.primary_guardian_relationship
        delete next.alternate_guardian_name
        delete next.guardian_notes
      }
      if (id === 'has_specific_gifts' && value === 'yes') {
        const existing = prev.specific_gifts
        if (!Array.isArray(existing) || existing.length === 0) {
          next.specific_gifts = [{ item: '', recipient: '' }]
        }
      }
      if (id === 'has_specific_gifts' && value === 'no') {
        delete next.specific_gifts
      }
      if (id === 'has_charitable_gifts' && value === 'yes') {
        const existing = prev.charitable_gifts
        if (!Array.isArray(existing) || existing.length === 0) {
          next.charitable_gifts = [{ item: '', recipient: '' }]
        }
      }
      if (id === 'has_charitable_gifts' && value === 'no') {
        delete next.charitable_gifts
      }
      return next
    })

    // After blur: live-update progressive error (min → max) and clear when fixed
    const field = visibleFields.find((f) => f.id === id)
    if (field) {
      setTouched((t) => {
        if (t[id]) {
          const msg = fieldQualityError(field, value)
          setFieldError(id, msg)
        }
        return t
      })
    }
  }

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(totalSections - 1, next))
    setSectionIdx(clamped)
    setAnimKey((k) => k + 1)
    setFieldErrors({})
    setTouched({})
  }

  async function handleContinue() {
    if (submitting) return
    if (isReview) {
      const active = sessionRef.current
      if (!active) {
        setBootError('No database session — answers were not saved. Check Supabase RLS / migration.')
        return
      }
      setSubmitting(true)
      try {
        await submitQuestionnaireToDb({ session: active, answers })
        setSubmitted(true)
      } catch (err) {
        setBootError(err instanceof Error ? err.message : 'Submit failed')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // On Continue: surface quality errors for this step (still one msg per field)
    const nextErrors: Record<string, string> = {}
    const nextTouched: Record<string, boolean> = { ...touched }
    for (const field of visibleFields) {
      const msg = fieldQualityError(field, answers[field.id])
      nextTouched[field.id] = true
      if (msg) nextErrors[field.id] = msg
    }
    setTouched(nextTouched)
    setFieldErrors(nextErrors)
    if (missing.length > 0 || Object.keys(nextErrors).length > 0) return

    if (sectionIdx < totalSections - 1) goTo(sectionIdx + 1)
  }

  const planLabel =
    order?.plan === 'couples' ? 'Couples' : order?.plan === 'individual' ? 'Individual' : null
  const orderSummary = order
    ? `${planLabel}${order.includeTrust ? ' + Trust' : ''} · $${order.total}`
    : null

  if (submitted) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
        <Wordmark />
        <h1 className="mt-8 font-serif text-4xl text-foreground">Submitted for review</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Thanks. A licensed Texas attorney reviews your will within 24 hours. Your answers are saved
          in the database.
        </p>
        <Button asChild className="mt-8 rounded-full px-8" size="lg">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
        <Wordmark />
        <p className="mt-8 text-muted-foreground">Starting your questionnaire…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_oklch(0.98_0.01_85)_0%,_var(--background)_55%)] text-foreground">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between gap-4 px-5 sm:px-0">
          <Link to="/" className="shrink-0 text-foreground transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          <div className="flex min-w-0 items-center gap-2.5 text-xs text-muted-foreground sm:gap-3">
            {orderSummary ? (
              <span className="truncate rounded-full border border-border/60 bg-background/80 px-3 py-1 font-medium text-foreground">
                {orderSummary}
              </span>
            ) : null}
            <span className={cn('shrink-0 transition', savedFlash && 'text-accent')}>
              {savedFlash ? 'Saved to DB' : session ? 'Autosaving' : 'Local only'}
            </span>
          </div>
        </div>
      </header>
      {bootError ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-center text-sm text-destructive">
          <p>{bootError}</p>
          <p className="mt-1 text-xs text-destructive/80">
            <Link to="/pricing#checkout" className="underline underline-offset-2">
              Return to pricing
            </Link>{' '}
            if you still need to pay.
          </p>
        </div>
      ) : null}

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
        <div
          key={animKey}
          className="my-auto w-full max-w-[800px] animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
        >
          {/* Soft section card */}
          <section className="rounded-3xl border border-border/50 bg-card/90 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur-sm">
            {/* Progress in section */}
            <div className="border-b border-border/40 px-6 pb-3.5 pt-4 sm:px-8">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.14em] text-accent">
                  Step {sectionIdx + 1} of {totalSections}
                </span>
                <span className="tabular-nums text-muted-foreground">{progressPct}% complete</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 px-6 pb-1 pt-5 sm:px-8">
              <h1 className="font-serif text-[1.55rem] leading-tight tracking-tight text-foreground">
                {section.title}
              </h1>
              <p className="max-w-xl text-[13px] leading-snug text-muted-foreground">{section.intro}</p>
            </div>

            <div className="px-6 py-4 sm:px-8">
              {isReview ? (
                <ReviewPanel
                  answers={answers}
                  order={order}
                  formSections={formSections}
                  onEdit={goTo}
                  onSubmit={handleContinue}
                  submitting={submitting}
                />
              ) : (
                <div className="space-y-4">
                  {fieldRows.map((row) => (
                    <div
                      key={row.map((f) => f.id).join('-')}
                      className={cn(
                        'grid items-start gap-4',
                        row.length === 2 && 'sm:grid-cols-2',
                        row.length === 3 && 'sm:grid-cols-[1.2fr_1fr_0.7fr]',
                      )}
                    >
                      {row.map((field) => (
                        <FieldCell
                          key={field.id}
                          field={field}
                          value={answers[field.id]}
                          error={fieldErrors[field.id]}
                          onChange={(v) => update(field.id, v)}
                          onBlurValidate={() => validateField(field, answers[field.id], true)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons in section */}
            {!isReview ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/40 px-6 py-3.5 sm:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 gap-1.5 rounded-full px-4 text-muted-foreground hover:text-foreground"
                  disabled={sectionIdx === 0}
                  onClick={() => goTo(sectionIdx - 1)}
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  Back
                </Button>

                <p className="hidden text-xs text-muted-foreground sm:block">
                  {missing.length > 0
                    ? `${missing.length} required left`
                    : Object.keys(fieldErrors).length > 0
                      ? 'Fix the highlighted fields'
                      : 'Looks good'}
                </p>

                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleContinue()}
                  className="h-10 gap-1.5 rounded-full px-6 shadow-sm disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 border-t border-border/40 px-6 py-3.5 sm:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 gap-1.5 rounded-full px-4 text-muted-foreground hover:text-foreground"
                  onClick={() => goTo(sectionIdx - 1)}
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  Back
                </Button>
                <p className="text-xs text-muted-foreground">Scroll up to edit any section</p>
              </div>
            )}
          </section>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Your answers autosave to the database. Close anytime — pick up where you left off.
          </p>
        </div>
      </main>
    </div>
  )
}

function FieldCell({
  field,
  value,
  error,
  onChange,
  onBlurValidate,
}: {
  field: Field
  value: unknown
  error?: string
  onChange: (v: unknown) => void
  onBlurValidate: () => void
}) {
  if (field.type === 'yesno') {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor={field.id} className="text-[12.5px] font-medium text-foreground">
            {shortLabelFor(field)}
            {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
          </Label>
          {field.helper ? (
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{field.helper}</p>
          ) : null}
          {error ? <p className="mt-1 text-[11.5px] text-destructive">{error}</p> : null}
        </div>
        <FieldControl
          field={field}
          value={value}
          error={error}
          onChange={onChange}
          onBlurValidate={onBlurValidate}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <Label htmlFor={field.id} className="text-[12.5px] font-medium text-foreground">
        {shortLabelFor(field)}
        {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      <div className="mt-1.5">
        <FieldControl
          field={field}
          value={value}
          error={error}
          onChange={onChange}
          onBlurValidate={onBlurValidate}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-destructive">{error}</p>
      ) : field.helper ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{field.helper}</p>
      ) : null}
    </div>
  )
}

function FieldControl({
  field,
  value,
  error,
  onChange,
  onBlurValidate,
}: {
  field: Field
  value: unknown
  error?: string
  onChange: (v: unknown) => void
  onBlurValidate: () => void
}) {
  if (field.type === 'radio' || field.type === 'yesno') {
    const options =
      field.type === 'yesno'
        ? [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]
        : (field.options ?? [])

    const shortLabels = options.every((o) => o.label.length <= 22)

    return (
      <div
        className={cn(
          'flex flex-wrap gap-2',
          field.type === 'yesno' && 'shrink-0 justify-end',
        )}
        onBlur={onBlurValidate}
      >
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                // radios/yesno: validate immediately after choose
                window.setTimeout(onBlurValidate, 0)
              }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-left text-[13px] transition',
                shortLabels && 'min-w-[4.5rem] text-center',
                !shortLabels && 'w-full rounded-2xl',
                selected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/70 bg-secondary/40 text-muted-foreground hover:border-foreground/20 hover:bg-secondary/70 hover:text-foreground',
                error && !selected && 'border-destructive/40',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'longtext') {
    return (
      <Textarea
        id={field.id}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value.slice(0, field.maxLength ?? 2000))}
        onBlur={onBlurValidate}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        className={cn(
          'min-h-[72px] resize-y rounded-2xl border-border/60 bg-secondary/30 text-sm shadow-none focus-visible:bg-background',
          error && 'border-destructive/50 focus-visible:ring-destructive/30',
        )}
      />
    )
  }

  if (field.type === 'people') {
    return (
      <PeopleEditor
        value={(Array.isArray(value) ? value : []) as PersonRow[]}
        onChange={onChange}
        onBlurValidate={onBlurValidate}
        requireDob={field.id === 'children'}
        maxLength={field.maxLength ?? 80}
        error={error}
      />
    )
  }

  if (field.type === 'gifts' || field.type === 'charitable_gifts') {
    return (
      <GiftsEditor
        value={(Array.isArray(value) ? value : []) as GiftRow[]}
        onChange={onChange}
        onBlurValidate={onBlurValidate}
        itemLabel={field.type === 'charitable_gifts' ? 'Amount or %' : 'Item / description'}
        recipientLabel={field.type === 'charitable_gifts' ? 'Charity name' : 'Who receives it'}
        maxLength={field.maxLength ?? 120}
        error={error}
      />
    )
  }

  if (field.type === 'date') {
    return (
      <DateField
        id={field.id}
        value={typeof value === 'string' ? value : ''}
        onChange={(v) => {
          onChange(v)
          window.setTimeout(onBlurValidate, 0)
        }}
        placeholder={field.placeholder ?? 'mm/dd/yyyy'}
      />
    )
  }

  if (field.type === 'phone') {
    return (
      <PhoneField
        id={field.id}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        onBlur={onBlurValidate}
        placeholder={field.placeholder ?? '(512) 555-0100'}
      />
    )
  }

  const inputType = field.type === 'email' ? 'email' : 'text'
  const str = typeof value === 'string' ? value : ''

  function handleTextChange(raw: string) {
    let next = raw
    if (field.id === 'address_zip') {
      next = raw.replace(/\D/g, '').slice(0, 5)
    } else if (field.id === 'address_city' || field.id === 'address_county') {
      next = raw.replace(/[^A-Za-z\s.'-]/g, '')
    } else if (field.id === 'trust_distribution_age') {
      next = raw.replace(/\D/g, '').slice(0, 3)
    }
    if (field.maxLength != null) next = next.slice(0, field.maxLength)
    onChange(next)
  }

  const isZip = field.id === 'address_zip'

  return (
    <Input
      id={field.id}
      type={inputType}
      inputMode={isZip || field.id === 'trust_distribution_age' ? 'numeric' : undefined}
      maxLength={field.maxLength ?? (isZip ? 5 : undefined)}
      autoComplete={
        field.id === 'address_city'
          ? 'address-level2'
          : field.id === 'address_zip'
            ? 'postal-code'
            : undefined
      }
      value={str}
      onChange={(e) => handleTextChange(e.target.value)}
      onBlur={onBlurValidate}
      onKeyDown={(e) => {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
        if (isZip && !/[0-9]/.test(e.key)) e.preventDefault()
        if (
          (field.id === 'address_city' || field.id === 'address_county') &&
          !/[A-Za-z\s.'-]/.test(e.key)
        ) {
          e.preventDefault()
        }
      }}
      placeholder={field.placeholder}
      className={cn(
        'h-10 rounded-2xl border-border/60 bg-secondary/30 text-sm shadow-none focus-visible:bg-background',
        error && 'border-destructive/50 focus-visible:ring-destructive/30',
      )}
    />
  )
}

function PeopleEditor({
  value,
  onChange,
  onBlurValidate,
  requireDob,
  maxLength,
  error,
}: {
  value: PersonRow[]
  onChange: (v: PersonRow[]) => void
  onBlurValidate: () => void
  requireDob: boolean
  maxLength: number
  error?: string
}) {
  const rows = value.length > 0 ? value : [{ name: '', date_of_birth: '' }]

  function setRow(i: number, patch: Partial<PersonRow>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    onChange(next)
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border/50 bg-secondary/20 p-3">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_36px] sm:items-center">
          <Input
            value={row.name}
            maxLength={maxLength}
            onChange={(e) => setRow(i, { name: e.target.value.slice(0, maxLength) })}
            onBlur={onBlurValidate}
            placeholder="Full name"
            className={cn(
              'h-9 rounded-xl border-border/60 bg-background text-sm',
              error && 'border-destructive/40',
            )}
          />
          {requireDob ? (
            <DateField
              value={row.date_of_birth ?? ''}
              onChange={(iso) => {
                setRow(i, { date_of_birth: iso })
                window.setTimeout(onBlurValidate, 0)
              }}
              inputClassName="h-9 rounded-xl bg-background"
            />
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs"
        onClick={() => onChange([...rows, { name: '', date_of_birth: '' }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another
      </Button>
    </div>
  )
}

function GiftsEditor({
  value,
  onChange,
  onBlurValidate,
  itemLabel,
  recipientLabel,
  maxLength,
  error,
}: {
  value: GiftRow[]
  onChange: (v: GiftRow[]) => void
  onBlurValidate: () => void
  itemLabel: string
  recipientLabel: string
  maxLength: number
  error?: string
}) {
  const rows = value.length > 0 ? value : [{ item: '', recipient: '' }]

  function setRow(i: number, patch: Partial<GiftRow>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    onChange(next)
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border/50 bg-secondary/20 p-3">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_36px] sm:items-center">
          <Input
            value={row.item}
            maxLength={maxLength}
            onChange={(e) => setRow(i, { item: e.target.value.slice(0, maxLength) })}
            onBlur={onBlurValidate}
            placeholder={itemLabel}
            className={cn(
              'h-9 rounded-xl border-border/60 bg-background text-sm',
              error && 'border-destructive/40',
            )}
          />
          <Input
            value={row.recipient}
            maxLength={maxLength}
            onChange={(e) => setRow(i, { recipient: e.target.value.slice(0, maxLength) })}
            onBlur={onBlurValidate}
            placeholder={recipientLabel}
            className={cn(
              'h-9 rounded-xl border-border/60 bg-background text-sm',
              error && 'border-destructive/40',
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs"
        onClick={() => onChange([...rows, { item: '', recipient: '' }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another
      </Button>
    </div>
  )
}

function ReviewPanel({
  answers,
  order,
  formSections,
  onEdit,
  onSubmit,
  submitting,
}: {
  answers: Answers
  order: OrderDraft | null
  formSections: Section[]
  onEdit: (idx: number) => void
  onSubmit: () => void | Promise<void>
  submitting?: boolean
}) {
  const planLabel =
    order?.plan === 'couples' ? 'Couples will' : order?.plan === 'individual' ? 'Individual will' : null

  const sections = getActiveSections(
    Boolean(order?.includeTrust),
    formSections,
    order?.documents ?? ['will'],
  ).filter((s) => !s.isReview && s.id !== 'review')

  return (
    <div className="space-y-5">
      {/* What they chose */}
      <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          Your order
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-serif text-xl text-foreground">
              {planLabel ?? 'Will package'}
              {order?.includeTrust ? ' + Living Trust' : ''}
            </p>
            {order?.email ? (
              <p className="mt-1 text-[13px] text-muted-foreground">
                Confirmation to <span className="font-medium text-foreground">{order.email}</span>
                {order.partnerEmail ? (
                  <>
                    {' '}
                    · Partner <span className="font-medium text-foreground">{order.partnerEmail}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          {order?.total != null ? (
            <p className="font-serif text-2xl tabular-nums text-foreground">${order.total}</p>
          ) : null}
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Please review each section below. Use <span className="font-medium text-foreground">Edit</span>{' '}
        to change anything, then submit when everything looks correct.
      </p>

      {/* Professional summary cards */}
      <div className="space-y-3">
        {sections.map((s, idx) => {
          const fields = getVisibleFields(s, answers)
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_0_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between gap-3 bg-secondary/30 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="font-serif text-lg tabular-nums text-accent">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h2 className="truncate font-serif text-[1.05rem] leading-tight text-foreground">
                    {s.title}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                  onClick={() => onEdit(idx)}
                >
                  Edit
                </Button>
              </div>
              <dl className="grid gap-0 sm:grid-cols-2">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      'border-t border-border/40 px-4 py-3 sm:px-5',
                      (f.type === 'longtext' ||
                        f.type === 'people' ||
                        f.type === 'gifts' ||
                        f.type === 'charitable_gifts' ||
                        f.type === 'radio') &&
                        'sm:col-span-2',
                    )}
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {f.label.replace(/ \(optional\)$/i, '')}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[13.5px] leading-snug text-foreground">
                      {formatAnswerPreview(f, answers[f.id])}
                    </dd>
                  </div>
                ))}
                {fields.length === 0 ? (
                  <div className="border-t border-border/40 px-4 py-3 text-[13px] text-muted-foreground sm:col-span-2 sm:px-5">
                    No answers in this section.
                  </div>
                ) : null}
              </dl>
            </div>
          )
        })}
      </div>

      {/* Direct submit after review */}
      <div className="rounded-2xl border border-primary/15 bg-primary px-5 py-5 text-primary-foreground sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-serif text-xl leading-tight">Ready to submit?</p>
            <p className="mt-1.5 text-[13px] text-primary-foreground/75">
              A licensed Texas attorney will review your will within 24 hours.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={submitting}
            onClick={() => void onSubmit()}
            className="h-12 shrink-0 gap-2 rounded-full bg-accent px-7 text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit for attorney review'}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  )
}
