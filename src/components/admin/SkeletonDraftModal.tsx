import { AlignCenter, AlignLeft, AlignRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import {
  BLOCK_KIND_OPTIONS,
  newLayoutBlock,
  type SkeletonBlock,
  type SkeletonBlockKind,
  type SkeletonDoc,
  type TextAlign,
} from '@/lib/skeleton-doc'
import { cn } from '@/lib/utils'

function AlignButtons({
  value,
  onChange,
}: {
  value: TextAlign
  onChange: (a: TextAlign) => void
}) {
  const opts: { a: TextAlign; icon: typeof AlignLeft }[] = [
    { a: 'left', icon: AlignLeft },
    { a: 'center', icon: AlignCenter },
    { a: 'right', icon: AlignRight },
  ]
  return (
    <div className="flex rounded-full border border-border p-0.5">
      {opts.map(({ a, icon: Icon }) => (
        <button
          key={a}
          type="button"
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

export function SkeletonDraftModal({
  open,
  title,
  description,
  doc,
  saving,
  onChange,
  onClose,
  onApplyToEditor,
  onSaveAsDraft,
  readOnly = false,
}: {
  open: boolean
  title: string
  description?: string
  doc: SkeletonDoc
  saving?: boolean
  onChange: (doc: SkeletonDoc) => void
  onClose: () => void
  onApplyToEditor: () => void
  onSaveAsDraft: () => void
  readOnly?: boolean
}) {
  function updateBlock(id: string, patch: Partial<SkeletonBlock>) {
    if (readOnly) return
    onChange({
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
  }

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      className="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
            Close
          </Button>
          {!readOnly ? (
            <>
              <Button type="button" variant="secondary" className="rounded-full" onClick={onApplyToEditor}>
                Use in main editor
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={saving}
                onClick={onSaveAsDraft}
              >
                {saving ? 'Saving…' : 'Save as new draft'}
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <fieldset disabled={readOnly} className="min-w-0 space-y-4 disabled:opacity-90">
      <div className="space-y-4">
        <div>
          <Label htmlFor="modal-skel-title">Document title</Label>
          <Input
            id="modal-skel-title"
            className="mt-1 rounded-2xl font-serif text-lg"
            value={doc.title}
            onChange={(e) => onChange({ ...doc, title: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {doc.blocks.length} blocks · A4 layout
          </p>
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full gap-1.5"
              onClick={() =>
                onChange({ ...doc, blocks: [...doc.blocks, newLayoutBlock('section')] })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add section
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {doc.blocks.map((block, index) => (
            <div key={block.id} className="rounded-2xl border border-border bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-serif text-sm tabular-nums text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <select
                  className="h-8 rounded-full border border-border bg-card px-2 text-xs"
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
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  Lines
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="h-7 w-12 rounded-lg border border-border px-1 text-xs"
                    value={block.blankLinesAfter}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        blankLinesAfter: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={block.pageBreakBefore || block.kind === 'page_break'}
                    disabled={block.kind === 'page_break'}
                    onChange={(e) => updateBlock(block.id, { pageBreakBefore: e.target.checked })}
                  />
                  Page break
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-8 w-8 text-destructive"
                  disabled={doc.blocks.length <= 1}
                  onClick={() =>
                    onChange({
                      ...doc,
                      blocks: doc.blocks.filter((b) => b.id !== block.id),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {(block.kind === 'section' || block.kind === 'heading') && (
                <Input
                  className="mb-2 rounded-xl font-serif"
                  value={block.heading}
                  onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                  placeholder="Heading"
                />
              )}
              {(block.kind === 'section' || block.kind === 'paragraph') && (
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={block.body}
                  onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                  placeholder="Body text"
                />
              )}
              {block.kind === 'signature' && (
                <Input
                  className="rounded-xl"
                  value={block.label}
                  onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                  placeholder="Signature label"
                />
              )}
              {block.kind === 'signature_pair' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    className="rounded-xl"
                    value={block.leftLabel}
                    onChange={(e) => updateBlock(block.id, { leftLabel: e.target.value })}
                    placeholder="Left label"
                  />
                  <Input
                    className="rounded-xl"
                    value={block.rightLabel}
                    onChange={(e) => updateBlock(block.id, { rightLabel: e.target.value })}
                    placeholder="Right label"
                  />
                </div>
              )}
              {block.kind === 'spacer' && (
                <p className="text-xs text-muted-foreground">
                  Blank spacer — adjust “Lines” above.
                </p>
              )}
              {block.kind === 'page_break' && (
                <p className="text-xs text-muted-foreground">Forces a new A4 page.</p>
              )}
            </div>
          ))}
        </div>
      </div>
      </fieldset>
    </Modal>
  )
}
