import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonDraftModal } from '@/components/admin/SkeletonDraftModal'
import {
  bundledSkeletonForKind,
  formSkeletonBodyForKind,
  getForm,
  listForms,
  saveFormSkeleton,
  type QuestionnaireFormSummary,
} from '@/lib/admin-forms'
import {
  DOCUMENT_KIND_BLURB,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_KINDS,
  parseDocumentKindParam,
  type DocumentKind,
} from '@/lib/document-kinds'
import { SECTIONS, type Section } from '@/lib/questionnaire'
import {
  BLOCK_KIND_OPTIONS,
  emptyBlock,
  fieldToken,
  insertAtCursor,
  listQuestionnaireFields,
  moveBlock,
  newLayoutBlock,
  parseSkeletonBody,
  serializeSkeletonDoc,
  skeletonCharCount,
  type SkeletonBlock,
  type SkeletonBlockKind,
  type SkeletonDoc,
  type TextAlign,
} from '@/lib/skeleton-doc'
import { renderSkeletonLayoutPdf } from '@/lib/skeleton-layout-pdf'
import { cn, pdfEmbedSrc } from '@/lib/utils'

const TOKEN_MIME = 'application/x-texas-will-field'

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 72)}px`
}

function AlignButtons({
  value,
  onChange,
}: {
  value: TextAlign
  onChange: (a: TextAlign) => void
}) {
  const opts: { a: TextAlign; icon: typeof AlignLeft; label: string }[] = [
    { a: 'left', icon: AlignLeft, label: 'Left' },
    { a: 'center', icon: AlignCenter, label: 'Center' },
    { a: 'right', icon: AlignRight, label: 'Right' },
  ]
  return (
    <div className="flex rounded-full border border-border p-0.5">
      {opts.map(({ a, icon: Icon, label }) => (
        <button
          key={a}
          type="button"
          title={label}
          onClick={() => onChange(a)}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full',
            value === a ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

export default function SkeletonEditorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const kindParam = parseDocumentKindParam(searchParams.get('kind'))
  const formIdParam = searchParams.get('formId')

  const [doc, setDoc] = useState<SkeletonDoc>({
    title: DOCUMENT_KIND_LABEL[kindParam].toUpperCase(),
    pageSize: 'A4',
    blocks: [],
  })
  const [skelKind, setSkelKind] = useState<DocumentKind>(kindParam)
  const [note, setNote] = useState('')
  const [defaultBody, setDefaultBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [forms, setForms] = useState<QuestionnaireFormSummary[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [schema, setSchema] = useState<Section[]>([...SECTIONS])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [addKind, setAddKind] = useState<SkeletonBlockKind>('section')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDoc, setModalDoc] = useState<SkeletonDoc | null>(null)
  const [modalLabel, setModalLabel] = useState('Draft')
  const [modalSaving, setModalSaving] = useState(false)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const fieldGroups = useMemo(() => listQuestionnaireFields(schema), [schema])
  const chars = useMemo(() => skeletonCharCount(doc), [doc])
  const selectedFormMeta = forms.find((f) => f.id === selectedFormId)
  const formSkeletonLocked = Boolean(selectedFormMeta?.is_default)

  async function refresh(opts?: { keepEditor?: boolean; formId?: string; kind?: DocumentKind }) {
    const formId = opts?.formId ?? selectedFormId
    const kind = opts?.kind ?? skelKind
    const bundled = bundledSkeletonForKind(kind)
    if (!formId) {
      if (!opts?.keepEditor) setDoc(parseSkeletonBody(bundled))
      setDefaultBody(bundled)
      setLoading(false)
      return
    }
    const form = await getForm(formId)
    const raw = formSkeletonBodyForKind(form, kind) ?? bundled
    if (!opts?.keepEditor) setDoc(parseSkeletonBody(raw))
    setDefaultBody(bundled)
    setLoading(false)
  }

  async function loadFormFields(formId: string) {
    setSchemaLoading(true)
    try {
      if (!formId) {
        setSchema([...SECTIONS])
        return
      }
      const form = await getForm(formId)
      setSchema(form.schema.length ? form.schema : [...SECTIONS])
    } catch {
      setSchema([...SECTIONS])
      setMsg('Could not load that questionnaire form — showing default fields.')
    } finally {
      setSchemaLoading(false)
    }
  }

  useEffect(() => {
    listForms()
      .then(async (rows) => {
        setForms(rows)
        const fromUrl = formIdParam && rows.some((r) => r.id === formIdParam) ? formIdParam : null
        const active = rows.find((f) => f.is_active)
        const def = rows.find((f) => f.is_default)
        const initialId = fromUrl ?? active?.id ?? def?.id ?? rows[0]?.id ?? ''
        setSelectedFormId(initialId)
        setSkelKind(kindParam)
        await loadFormFields(initialId)
        await refresh({ formId: initialId, kind: kindParam })
      })
      .catch((e) => {
        setSelectedFormId('')
        setSchema([...SECTIONS])
        setMsg(e instanceof Error ? e.message : 'Failed to load skeleton')
        setDoc(parseSkeletonBody(bundledSkeletonForKind(kindParam)))
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When questionnaire form or kind changes: reload fields + skeleton
  useEffect(() => {
    if (loading) return
    void loadFormFields(selectedFormId)
    void refresh({ formId: selectedFormId, kind: skelKind }).catch((e) => {
      setMsg(e instanceof Error ? e.message : 'Failed to load form skeleton')
    })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (selectedFormId) next.set('formId', selectedFormId)
        else next.delete('formId')
        next.set('kind', skelKind)
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId, skelKind])

  useLayoutEffect(() => {
    for (const block of doc.blocks) autosize(textareaRefs.current[block.id] ?? null)
  }, [doc.blocks])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  // Live A4 PDF view — rebuild shortly after edits stop
  useEffect(() => {
    if (loading) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setPreviewBusy(true)
      void renderSkeletonLayoutPdf(doc, {})
        .then((bytes) => {
          if (cancelled) return
          const copy = new Uint8Array(bytes)
          const blob = new Blob([copy], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        })
        .catch((e) => {
          if (!cancelled) {
            setMsg(e instanceof Error ? e.message : 'PDF preview failed')
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewBusy(false)
        })
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, loading])

  function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${doc.title || 'Will-skeleton'}-A4.pdf`
    a.click()
  }

  function updateBlock(id: string, patch: Partial<SkeletonBlock>) {
    if (formSkeletonLocked) return
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))
  }

  function insertTokenIntoBlock(blockId: string, fieldId: string) {
    if (formSkeletonLocked) {
      setMsg('Default skeletons are locked. Duplicate the questionnaire form to customize templates.')
      return
    }
    const token = fieldToken(fieldId)
    const el = textareaRefs.current[blockId]
    const block = doc.blocks.find((b) => b.id === blockId)
    if (!block) return
    if (block.kind === 'page_break' || block.kind === 'spacer') return

    const fieldKey =
      block.kind === 'signature'
        ? 'label'
        : block.kind === 'heading'
          ? 'heading'
          : block.kind === 'signature_pair'
            ? 'leftLabel'
            : 'body'

    const current =
      fieldKey === 'label'
        ? block.label
        : fieldKey === 'heading'
          ? block.heading
          : fieldKey === 'leftLabel'
            ? block.leftLabel
            : block.body

    if (el && document.activeElement === el) {
      const start = el.selectionStart ?? current.length
      const end = el.selectionEnd ?? start
      const { value, cursor } = insertAtCursor(current, token, start, end)
      updateBlock(blockId, { [fieldKey]: value })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(cursor, cursor)
        autosize(el)
      })
      return
    }

    const next = current.trimEnd()
    updateBlock(blockId, { [fieldKey]: next ? `${next} ${token}` : token })
    setFocusedBlockId(blockId)
  }

  function onDropToken(blockId: string, e: React.DragEvent) {
    e.preventDefault()
    setDropTargetId(null)
    const fieldId = e.dataTransfer.getData(TOKEN_MIME) || e.dataTransfer.getData('text/plain')
    if (!fieldId) return
    insertTokenIntoBlock(blockId, fieldId.replace(/^\{\{|\}\}$/g, ''))
  }

  async function saveDraft() {
    setSaving(true)
    setMsg(null)
    try {
      if (!selectedFormId) {
        throw new Error('Pick a questionnaire form to save this skeleton onto.')
      }
      if (formSkeletonLocked) {
        throw new Error(
          'Default form skeletons are locked. Duplicate the form to customize, or edit layout on an order.',
        )
      }
      const body = serializeSkeletonDoc(doc)
      await saveFormSkeleton({
        formId: selectedFormId,
        body,
        kind: skelKind,
        note: note || undefined,
      })
      setMsg(`${DOCUMENT_KIND_LABEL[skelKind]} skeleton saved on this questionnaire form`)
      setNote('')
      await refresh({ keepEditor: true, formId: selectedFormId, kind: skelKind })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function openDefaultModal() {
    setModalDoc(parseSkeletonBody(defaultBody))
    setModalLabel('Built-in default')
    setModalOpen(true)
  }

  async function saveModalAsDraft() {
    if (!modalDoc) return
    setModalSaving(true)
    setMsg(null)
    try {
      if (!selectedFormId || formSkeletonLocked) {
        throw new Error(
          'Default form skeletons are locked. Duplicate the questionnaire form first, then save onto that copy.',
        )
      }
      const body = serializeSkeletonDoc(modalDoc)
      await saveFormSkeleton({
        formId: selectedFormId,
        body,
        kind: skelKind,
        note: modalLabel === 'Built-in default' ? 'Edited from built-in default' : `Edited ${modalLabel}`,
      })
      setDoc(modalDoc)
      setMsg(`${DOCUMENT_KIND_LABEL[skelKind]} skeleton saved on this questionnaire form`)
      setModalOpen(false)
      setModalDoc(null)
      await refresh({ keepEditor: true, formId: selectedFormId, kind: skelKind })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setModalSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading will skeleton…</p>
  }

  const clientAnswersSidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/60 px-3 py-3">
        <h2 className="text-sm font-medium">Client answers</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Pick a questionnaire, then drag fields into text or signature labels.
        </p>
        <Label htmlFor="skel-form-select" className="mt-3 block text-[11px]">
          Questionnaire form
        </Label>
        <select
          id="skel-form-select"
          className="mt-1 flex h-9 w-full rounded-xl border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          value={selectedFormId}
          onChange={(e) => {
            const id = e.target.value
            setSelectedFormId(id)
            void loadFormFields(id)
          }}
        >
          {forms.length === 0 ? (
            <option value="">No questionnaire forms</option>
          ) : null}
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.is_active ? ' (active)' : ''}
              {f.is_default ? ' · default · locked' : ''}
            </option>
          ))}
        </select>
        <Label htmlFor="skel-kind" className="mt-3 block text-[11px]">
          Document (separate PDF)
        </Label>
        <select
          id="skel-kind"
          className="mt-1 flex h-9 w-full rounded-xl border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          value={skelKind}
          onChange={(e) => setSkelKind(e.target.value as DocumentKind)}
        >
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {DOCUMENT_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
          {DOCUMENT_KIND_BLURB[skelKind]}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {schemaLoading ? (
          <p className="text-xs text-muted-foreground">Loading fields…</p>
        ) : (
          fieldGroups.map((group) => (
            <div key={group.sectionTitle}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.sectionTitle}
              </p>
              <ul className="space-y-1">
                {group.fields.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TOKEN_MIME, f.id)
                        e.dataTransfer.setData('text/plain', f.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => {
                        const target =
                          focusedBlockId ?? doc.blocks[doc.blocks.length - 1]?.id ?? null
                        if (!target) {
                          setMsg('Add a block first, then drop or click a field.')
                          return
                        }
                        insertTokenIntoBlock(target, f.id)
                      }}
                      className="flex w-full items-center gap-1.5 rounded-xl border border-border/70 bg-background px-2 py-1.5 text-left text-[11px] font-medium transition hover:border-foreground/35 hover:bg-secondary"
                      title={`Insert {{${f.id}}}`}
                    >
                      <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                      <span className="min-w-0 flex-1 leading-snug">{f.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="lg:-mx-2 xl:-mx-4">
      <div className="flex gap-0 lg:gap-5">
        <aside className="sticky top-[4.25rem] hidden h-[calc(100dvh-5.5rem)] w-52 shrink-0 overflow-hidden rounded-2xl border border-border bg-card lg:block xl:w-56">
          {clientAnswersSidebar}
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 className="font-serif text-2xl tracking-tight">Document skeleton</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Design layouts for non-default questionnaire forms. Default skeletons are locked —
                duplicate that form to customize, or fix layouts per order.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Page size: <span className="font-medium text-foreground">A4</span>
                {' · '}
                Active:{' '}
                <span className="font-medium text-foreground">
                  {forms.find((f) => f.id === selectedFormId)?.name ?? 'Select a form'}
                  {formSkeletonLocked ? ' · locked' : ''}
                </span>
                {' · '}
                {doc.blocks.length} blocks · {chars.toLocaleString()} chars
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => openDefaultModal()}
              >
                View built-in default
              </Button>
              {!formSkeletonLocked ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setDoc(parseSkeletonBody(defaultBody))
                      setMsg('Loaded built-in default into main editor — Save on form to keep it')
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Load default
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full gap-1.5"
                    disabled={saving}
                    onClick={() => void saveDraft()}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save as new draft'}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {msg ? (
            <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
          ) : null}

          {formSkeletonLocked ? (
            <p className="rounded-lg border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
              Viewing a locked default skeleton (read-only). Duplicate the default questionnaire to
              edit form templates. Order-level layout fixes stay on each order’s layout tabs.
            </p>
          ) : null}

          {/* Mobile / tablet PDF view */}
          <section className="space-y-2 xl:hidden">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-serif text-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                A4 PDF view
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
                disabled={!pdfUrl || previewBusy}
                onClick={() => downloadPdf()}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
            {previewBusy && !pdfUrl ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
                Building PDF…
              </div>
            ) : pdfUrl ? (
              <iframe
                title="A4 skeleton PDF"
                src={pdfEmbedSrc(pdfUrl)}
                className="h-[70vh] w-full rounded-2xl border border-border bg-white"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
                PDF will appear here
              </div>
            )}
          </section>

          <details className="rounded-2xl border border-border bg-card lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Client answers
            </summary>
            <div className="max-h-80 border-t border-border/60">{clientAnswersSidebar}</div>
          </details>

          <section className="space-y-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg">Form skeleton</h2>
                <p className="text-xs text-muted-foreground">
                  {formSkeletonLocked
                    ? 'This form’s skeletons are locked (default). Duplicate the form to customize templates.'
                    : 'Each non-default questionnaire form has its own document skeletons. Select the form on the left, arrange blocks with answer tokens, then save onto that form.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!formSkeletonLocked ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full gap-1.5"
                      onClick={openDefaultModal}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Load built-in default
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full gap-1.5"
                      disabled={saving || !selectedFormId}
                      onClick={() => void saveDraft()}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving…' : 'Save on form'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full gap-1.5"
                    onClick={openDefaultModal}
                  >
                    View built-in default
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <fieldset disabled={formSkeletonLocked} className="min-w-0 space-y-4 disabled:opacity-90">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="skel-title">Document title</Label>
                <Input
                  id="skel-title"
                  className="mt-1 rounded-2xl font-serif text-lg"
                  value={doc.title}
                  onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="add-kind" className="text-xs">
                  Add block
                </Label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="add-kind"
                    className="h-10 rounded-full border border-input bg-background px-3 text-sm"
                    value={addKind}
                    onChange={(e) => setAddKind(e.target.value as SkeletonBlockKind)}
                  >
                    {BLOCK_KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full gap-1.5"
                    onClick={() =>
                      setDoc((d) => ({ ...d, blocks: [...d.blocks, newLayoutBlock(addKind)] }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {doc.blocks.map((block, index) => (
                <section
                  key={block.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropTargetId(block.id)
                  }}
                  onDragLeave={() => setDropTargetId((id) => (id === block.id ? null : id))}
                  onDrop={(e) => onDropToken(block.id, e)}
                  className={cn(
                    'rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,23,42,0.03)] transition',
                    dropTargetId === block.id
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-border/70',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-secondary/25 px-3 py-2">
                    <span className="font-serif text-sm tabular-nums text-accent">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <select
                      className="h-8 rounded-full border border-border bg-background px-2 text-xs"
                      value={block.kind}
                      onChange={(e) =>
                        updateBlock(block.id, { kind: e.target.value as SkeletonBlockKind })
                      }
                    >
                      {BLOCK_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {block.kind !== 'page_break' && block.kind !== 'spacer' ? (
                      <AlignButtons
                        value={block.align}
                        onChange={(align) => updateBlock(block.id, { align })}
                      />
                    ) : null}
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={block.pageBreakBefore || block.kind === 'page_break'}
                        disabled={block.kind === 'page_break'}
                        onChange={(e) => updateBlock(block.id, { pageBreakBefore: e.target.checked })}
                      />
                      Page break before
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Blank lines
                      <input
                        type="number"
                        min={0}
                        max={20}
                        className="h-7 w-14 rounded-lg border border-border bg-background px-1.5 text-xs"
                        value={block.blankLinesAfter}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            blankLinesAfter: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                          })
                        }
                      />
                    </label>
                    <div className="ml-auto flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={index === 0}
                        onClick={() =>
                          setDoc((d) => ({ ...d, blocks: moveBlock(d.blocks, index, -1) }))
                        }
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={index === doc.blocks.length - 1}
                        onClick={() =>
                          setDoc((d) => ({ ...d, blocks: moveBlock(d.blocks, index, 1) }))
                        }
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={doc.blocks.length <= 1}
                        onClick={() =>
                          setDoc((d) => ({
                            ...d,
                            blocks: d.blocks.filter((b) => b.id !== block.id),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 px-4 py-3">
                    {(block.kind === 'section' || block.kind === 'heading') && (
                      <Input
                        value={block.heading}
                        onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                        onFocus={() => setFocusedBlockId(block.id)}
                        className="rounded-xl font-serif"
                        placeholder="Heading"
                      />
                    )}
                    {(block.kind === 'section' || block.kind === 'paragraph') && (
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[block.id] = el
                          autosize(el)
                        }}
                        value={block.body}
                        onChange={(e) => {
                          updateBlock(block.id, { body: e.target.value })
                          autosize(e.target)
                        }}
                        onFocus={() => setFocusedBlockId(block.id)}
                        placeholder="Legal text. Drop {{client answers}} here."
                        rows={3}
                        className="w-full resize-none overflow-hidden rounded-xl border border-border/50 bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      />
                    )}
                    {block.kind === 'signature' && (
                      <Input
                        value={block.label}
                        onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                        onFocus={() => setFocusedBlockId(block.id)}
                        className="rounded-xl"
                        placeholder="Signature label"
                      />
                    )}
                    {block.kind === 'signature_pair' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={block.leftLabel}
                          onChange={(e) => updateBlock(block.id, { leftLabel: e.target.value })}
                          onFocus={() => setFocusedBlockId(block.id)}
                          className="rounded-xl"
                          placeholder="Left signature label"
                        />
                        <Input
                          value={block.rightLabel}
                          onChange={(e) => updateBlock(block.id, { rightLabel: e.target.value })}
                          onFocus={() => setFocusedBlockId(block.id)}
                          className="rounded-xl"
                          placeholder="Right signature label"
                        />
                      </div>
                    )}
                    {block.kind === 'spacer' && (
                      <p className="text-xs text-muted-foreground">
                        Inserts {block.blankLinesAfter || 1} blank line
                        {(block.blankLinesAfter || 1) === 1 ? '' : 's'} on the A4 page.
                      </p>
                    )}
                    {block.kind === 'page_break' && (
                      <p className="text-xs text-muted-foreground">
                        Forces a new A4 page here (page size is fixed to A4).
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {doc.blocks.length === 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => setDoc((d) => ({ ...d, blocks: [emptyBlock('Preamble')] }))}
              >
                Add first section
              </Button>
            ) : null}

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="skeleton-note" className="text-xs">
                  Draft note (optional)
                </Label>
                <Input
                  id="skeleton-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Centered signatures + page break before affidavit"
                  className="rounded-2xl"
                />
              </div>
              <Button
                type="button"
                className="rounded-full gap-1.5 sm:shrink-0"
                disabled={saving || formSkeletonLocked}
                onClick={() => void saveDraft()}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save as new draft'}
              </Button>
            </div>
            </fieldset>
          </section>
        </div>

        {/* Desktop sticky A4 PDF view */}
        <aside className="sticky top-[4.25rem] hidden h-[calc(100dvh-5.5rem)] w-[min(48vw,560px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card xl:flex 2xl:w-[min(46vw,640px)]">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                A4 PDF view
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {previewBusy ? 'Updating…' : 'Live preview of this document'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full gap-1.5"
              disabled={!pdfUrl || previewBusy}
              onClick={() => downloadPdf()}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
          <div className="min-h-0 flex-1 bg-secondary/20 p-1">
            {pdfUrl ? (
              <iframe
                title="A4 skeleton PDF"
                src={pdfEmbedSrc(pdfUrl)}
                className="h-full w-full rounded-xl border border-border bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
                {previewBusy ? 'Building PDF…' : 'PDF will appear here'}
              </div>
            )}
          </div>
        </aside>
      </div>

      <SkeletonDraftModal
        open={modalOpen && modalDoc != null}
        title={modalLabel}
        description={
          formSkeletonLocked
            ? 'Read-only view of the built-in default. Duplicate the questionnaire form to save customized skeletons.'
            : 'Edit here without losing your current main-editor work. Apply to copy into the main editor, or save onto the selected form.'
        }
        doc={
          modalDoc ?? {
            title: 'LAST WILL AND TESTAMENT',
            pageSize: 'A4',
            blocks: [],
          }
        }
        saving={modalSaving}
        onChange={(next) => {
          if (formSkeletonLocked) return
          setModalDoc(next)
        }}
        onClose={() => {
          setModalOpen(false)
          setModalDoc(null)
        }}
        onApplyToEditor={() => {
          if (formSkeletonLocked) {
            setMsg('Default skeletons are locked. Duplicate the questionnaire form first.')
            return
          }
          if (!modalDoc) return
          setDoc(modalDoc)
          setModalOpen(false)
          setModalDoc(null)
          setMsg(`${modalLabel} applied to the main editor — Save on form to keep it`)
        }}
        onSaveAsDraft={() => void saveModalAsDraft()}
        readOnly={formSkeletonLocked}
      />
    </div>
  )
}
