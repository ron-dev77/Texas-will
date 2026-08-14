import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BLOCK_KIND_OPTIONS,
  emptyBlock,
  fieldToken,
  insertAtCursor,
  listQuestionnaireFields,
  moveBlock,
  newLayoutBlock,
  skeletonCharCount,
  type SkeletonBlock,
  type SkeletonBlockKind,
  type SkeletonDoc,
  type TextAlign,
} from '@/lib/skeleton-doc'
import { formatAnswerPreview, type Section } from '@/lib/questionnaire'
import { renderSkeletonLayoutPdf } from '@/lib/skeleton-layout-pdf'
import type { SkeletonFillOptions } from '@/lib/skeleton-doc'
import { cn, pdfEmbedSrc } from '@/lib/utils'

const TOKEN_MIME = 'application/x-texas-will-field'

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 200)}px`
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
    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
      {opts.map(({ a, icon: Icon, label }) => (
        <button
          key={a}
          type="button"
          title={label}
          onClick={() => onChange(a)}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md transition',
            value === a
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

export type VisualSkeletonWorkspaceProps = {
  doc: SkeletonDoc
  onChange: (doc: SkeletonDoc) => void
  schema: Section[]
  /** When set, sidebar shows filled answer values (order mode). */
  answers?: Record<string, unknown>
  fillOptions?: SkeletonFillOptions
  sidebarTitle?: string
  sidebarHint?: string
  header?: React.ReactNode
  footerActions?: React.ReactNode
  saving?: boolean
  onSave?: () => void
  saveLabel?: string
  className?: string
  /** Hide built-in A4 preview (use when parent already shows PDF). Default true. */
  showEmbeddedPdf?: boolean
  /** Hide left field sidebar. Default true. */
  showFieldSidebar?: boolean
}

export function VisualSkeletonWorkspace({
  doc,
  onChange,
  schema,
  answers,
  fillOptions,
  sidebarTitle = 'Form fields',
  sidebarHint = 'Drag a field into text, or click to insert at the cursor.',
  header,
  footerActions,
  saving,
  onSave,
  saveLabel = 'Save',
  className,
  showEmbeddedPdf = true,
  showFieldSidebar = true,
}: VisualSkeletonWorkspaceProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [addKind, setAddKind] = useState<SkeletonBlockKind>('section')
  const [msg, setMsg] = useState<string | null>(null)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const fieldGroups = useMemo(() => listQuestionnaireFields(schema), [schema])
  const chars = useMemo(() => skeletonCharCount(doc), [doc])

  useLayoutEffect(() => {
    for (const block of doc.blocks) autosize(textareaRefs.current[block.id] ?? null)
  }, [doc.blocks])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setPreviewBusy(true)
      void renderSkeletonLayoutPdf(doc, answers ?? {}, fillOptions)
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
          if (!cancelled) setMsg(e instanceof Error ? e.message : 'PDF preview failed')
        })
        .finally(() => {
          if (!cancelled) setPreviewBusy(false)
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [doc, answers, fillOptions])

  function setDoc(updater: SkeletonDoc | ((prev: SkeletonDoc) => SkeletonDoc)) {
    onChange(typeof updater === 'function' ? updater(doc) : updater)
  }

  function updateBlock(id: string, patch: Partial<SkeletonBlock>) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))
  }

  function insertTokenIntoBlock(blockId: string, fieldId: string) {
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

  function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${doc.title || 'document'}-A4.pdf`
    a.click()
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/60 px-3 py-3">
        <h2 className="text-sm font-medium">{sidebarTitle}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{sidebarHint}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {fieldGroups.map((group) => (
          <div key={group.sectionTitle}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.sectionTitle}
            </p>
            <ul className="space-y-1">
              {group.fields.map((f) => {
                const filled =
                  answers != null ? formatAnswerPreview(f, answers[f.id]) : null
                return (
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
                      className="flex w-full items-start gap-1.5 rounded-xl border border-border/70 bg-background px-2 py-1.5 text-left text-[11px] transition hover:border-foreground/35 hover:bg-secondary"
                      title={`Insert {{${f.id}}}`}
                    >
                      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-40" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{f.label}</span>
                        {filled != null ? (
                          <span className="mt-0.5 block text-muted-foreground">{filled}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={cn(className)}>
      {header}
      {msg ? (
        <p className="mb-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="flex gap-0 lg:gap-4">
        {showFieldSidebar ? (
          <aside className="sticky top-[4.25rem] hidden h-[calc(100dvh-5.5rem)] w-52 shrink-0 overflow-hidden rounded-2xl border border-border bg-card lg:block xl:w-56">
            {sidebar}
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 space-y-4">
          {showFieldSidebar ? (
            <details className="rounded-2xl border border-border bg-card lg:hidden">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{sidebarTitle}</summary>
              <div className="max-h-80 border-t border-border/60">{sidebar}</div>
            </details>
          ) : null}

          {showEmbeddedPdf ? (
            <section className="space-y-2 xl:hidden">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-serif text-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  A4 PDF
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  disabled={!pdfUrl || previewBusy}
                  onClick={downloadPdf}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
              {pdfUrl ? (
                <iframe
                  title="A4 PDF"
                  src={pdfEmbedSrc(pdfUrl)}
                  className="h-[50vh] w-full rounded-2xl border border-border bg-white"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                  {previewBusy ? 'Building PDF…' : 'PDF will appear here'}
                </div>
              )}
            </section>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="space-y-3">
              <div>
                <Label htmlFor="skel-title">Document title</Label>
                <Input
                  id="skel-title"
                  className="mt-1.5 h-11 rounded-xl font-serif text-base"
                  value={doc.title}
                  onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {doc.blocks.length} blocks · {chars.toLocaleString()} characters
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="add-kind"
                    aria-label="Block type to add"
                    className="h-9 min-w-[12rem] flex-1 rounded-xl border border-input bg-background px-3 text-sm sm:flex-none"
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
                    size="sm"
                    className="h-9 rounded-xl gap-1.5"
                    onClick={() =>
                      setDoc({ ...doc, blocks: [...doc.blocks, newLayoutBlock(addKind)] })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add block
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
                    'rounded-2xl border bg-card transition',
                    dropTargetId === block.id
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-border/70',
                  )}
                >
                  <div className="border-b border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-8 shrink-0 font-serif text-base tabular-nums text-accent">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Block type
                        </label>
                        <select
                          className="h-9 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
                      </div>
                      <div className="flex shrink-0 items-center self-end rounded-lg border border-border/70 bg-background p-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => setDoc({ ...doc, blocks: moveBlock(doc.blocks, index, -1) })}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Move down"
                          disabled={index === doc.blocks.length - 1}
                          onClick={() => setDoc({ ...doc, blocks: moveBlock(doc.blocks, index, 1) })}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <div className="mx-0.5 h-5 w-px bg-border/70" />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete block"
                          disabled={doc.blocks.length <= 1}
                          onClick={() =>
                            setDoc({
                              ...doc,
                              blocks: doc.blocks.filter((b) => b.id !== block.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {block.kind !== 'page_break' ? (
                      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-border/40 px-4 py-2.5 pl-16">
                        {block.kind !== 'spacer' ? (
                          <div>
                            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Align
                            </p>
                            <AlignButtons
                              value={block.align}
                              onChange={(align) => updateBlock(block.id, { align })}
                            />
                          </div>
                        ) : null}
                        <div>
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Page
                          </p>
                          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border-border accent-foreground"
                              checked={Boolean(block.pageBreakBefore)}
                              onChange={(e) =>
                                updateBlock(block.id, { pageBreakBefore: e.target.checked })
                              }
                            />
                            Start on new page
                          </label>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Spacing after
                          </p>
                          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                            <span className="text-muted-foreground">Blank lines</span>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              className="h-7 w-14 rounded-md border border-border bg-card px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                              value={block.blankLinesAfter}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  blankLinesAfter: Math.max(
                                    0,
                                    Math.min(20, Number(e.target.value) || 0),
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-border/40 px-4 py-2.5 pl-16">
                        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="size-3.5 rounded border-border accent-foreground"
                            checked={Boolean(block.pageBreakBefore)}
                            onChange={(e) =>
                              updateBlock(block.id, { pageBreakBefore: e.target.checked })
                            }
                          />
                          Start on new page
                        </label>
                      </div>
                    )}
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
                        placeholder="Legal text. Drop {{answers}} here."
                        rows={8}
                        className="min-h-[200px] w-full resize-y overflow-auto rounded-xl border border-border/50 bg-background px-3 py-3 text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
                        {(block.blankLinesAfter || 1) === 1 ? '' : 's'}.
                      </p>
                    )}
                    {block.kind === 'page_break' && (
                      <p className="text-xs text-muted-foreground">
                        When checked, starts a new A4 page. Uncheck to keep content on this page.
                        Breaks are also skipped automatically if remaining content still fits.
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
                onClick={() => setDoc({ ...doc, blocks: [emptyBlock('Preamble')] })}
              >
                Add first section
              </Button>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {footerActions}
              {onSave ? (
                <Button
                  type="button"
                  className="rounded-full gap-1.5"
                  disabled={saving}
                  onClick={onSave}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : saveLabel}
                </Button>
              ) : null}
            </div>
          </section>
        </div>

        {showEmbeddedPdf ? (
          <aside className="sticky top-[4.25rem] hidden h-[calc(100dvh-5.5rem)] w-[min(48vw,560px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card xl:flex 2xl:w-[min(46vw,640px)]">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  A4 PDF
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {previewBusy ? 'Updating…' : 'Live preview'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full gap-1.5"
                disabled={!pdfUrl || previewBusy}
                onClick={downloadPdf}
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
            <div className="min-h-0 flex-1 bg-secondary/20 p-1">
              {pdfUrl ? (
                <iframe
                  title="A4 PDF"
                  src={pdfEmbedSrc(pdfUrl)}
                  className="h-full w-full rounded-xl border border-border bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  {previewBusy ? 'Building PDF…' : 'PDF will appear here'}
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
