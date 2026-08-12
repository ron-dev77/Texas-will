import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FIELD_TYPES,
  WILL_ENGINE_FIELD_IDS,
  activateForm,
  getForm,
  missingWillEngineKeys,
  newField,
  newSection,
  updateForm,
  validateQuestionnaireSchema,
} from '@/lib/admin-forms'
import type { Field, FieldType, Section, ShowIf } from '@/lib/questionnaire'

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = index + dir
  if (next < 0 || next >= list.length) return list
  const copy = [...list]
  const tmp = copy[index]
  copy[index] = copy[next]
  copy[next] = tmp
  return copy
}

function cloneSections(sections: Section[]): Section[] {
  return sections.map((s) => ({
    ...s,
    fields: s.fields.map((f) => ({
      ...f,
      options: f.options ? f.options.map((o) => ({ ...o })) : undefined,
      showIf: f.showIf ? { ...f.showIf } : undefined,
    })),
  }))
}

export default function QuestionnaireFormEditorPage() {
  const { formId } = useParams<{ formId: string }>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [isActive, setIsActive] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0)
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const section = sections[selectedSectionIdx] ?? null
  const field =
    section && selectedFieldIdx != null ? (section.fields[selectedFieldIdx] ?? null) : null

  const missingKeys = useMemo(() => missingWillEngineKeys(sections), [sections])
  const validation = useMemo(() => validateQuestionnaireSchema(sections), [sections])

  async function load() {
    if (!formId) return
    const form = await getForm(formId)
    setName(form.name)
    setDescription(form.description ?? '')
    setSections(cloneSections(form.schema))
    setIsActive(form.is_active)
    setIsDefault(form.is_default)
    setSelectedSectionIdx(0)
    setSelectedFieldIdx(null)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load().catch((e) => {
      setMsg(e instanceof Error ? e.message : 'Failed to load form')
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  function updateSection(idx: number, patch: Partial<Section>) {
    if (isDefault) return
    setSections((prev) => {
      const next = cloneSections(prev)
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  function updateField(sectionIdx: number, fieldIdx: number, patch: Partial<Field>) {
    if (isDefault) return
    setSections((prev) => {
      const next = cloneSections(prev)
      const fields = [...next[sectionIdx].fields]
      fields[fieldIdx] = { ...fields[fieldIdx], ...patch }
      next[sectionIdx] = { ...next[sectionIdx], fields }
      return next
    })
  }

  function addSection() {
    if (isDefault) return
    setSections((prev) => {
      const next = [...cloneSections(prev), newSection(prev.length)]
      setSelectedSectionIdx(next.length - 1)
      setSelectedFieldIdx(null)
      return next
    })
  }

  function removeSection(idx: number) {
    if (isDefault) return
    if (sections.length <= 1) {
      setMsg('A form needs at least one section.')
      return
    }
    setSections((prev) => {
      const next = cloneSections(prev).filter((_, i) => i !== idx)
      setSelectedSectionIdx(Math.min(idx, next.length - 1))
      setSelectedFieldIdx(null)
      return next
    })
  }

  function addField() {
    if (isDefault || !section) return
    const idx = selectedSectionIdx
    setSections((prev) => {
      const next = cloneSections(prev)
      const fields = [...next[idx].fields, newField(next[idx].fields.length)]
      next[idx] = { ...next[idx], fields }
      setSelectedFieldIdx(fields.length - 1)
      return next
    })
  }

  function removeField(fieldIdx: number) {
    if (isDefault) return
    const idx = selectedSectionIdx
    setSections((prev) => {
      const next = cloneSections(prev)
      const fields = next[idx].fields.filter((_, i) => i !== fieldIdx)
      next[idx] = { ...next[idx], fields }
      setSelectedFieldIdx(null)
      return next
    })
  }

  async function save() {
    if (!formId) return
    if (isDefault) {
      setMsg('The default form is locked. Duplicate it to customize.')
      return
    }
    if (!validation.ok) {
      setMsg(validation.error)
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await updateForm({
        id: formId,
        name,
        description,
        schema: sections,
        note: note || undefined,
      })
      setNote('')
      setMsg(`Saved (history v${res.version_no})`)
      setIsActive(res.form.is_active)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onActivate() {
    if (!formId) return
    setSaving(true)
    setMsg(null)
    try {
      await activateForm(formId)
      setIsActive(true)
      setMsg('This form is now active for customers')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Activate failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/content/questionnaire"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All forms
          </Link>
          <h1 className="font-serif text-2xl tracking-tight">
            {name || (isDefault ? 'View form' : 'Edit form')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDefault ? 'Default form · locked · ' : null}
            {isActive ? 'Active for live questionnaire' : 'Not active — Activate to use live'}
          </p>
        </div>
            <div className="flex flex-wrap gap-2">
              {!isActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  disabled={saving}
                  onClick={() => void onActivate()}
                >
                  Activate
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                asChild
              >
                <Link to={`/admin/content/skeleton?formId=${formId}&kind=will`}>
                  Document skeletons
                </Link>
              </Button>
              {!isDefault ? (
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              ) : null}
            </div>
      </div>

      {msg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      {isDefault ? (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
          This default questionnaire is locked. Duplicate it from the forms list to customize
          questions. Minor document layout fixes belong on each order’s layout tabs — not here.
        </p>
      ) : null}

      {!validation.ok ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {validation.error}
        </p>
      ) : null}

      {missingKeys.length > 0 ? (
        <details className="rounded-lg border border-amber-300/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-950">
          <summary className="cursor-pointer font-medium">
            Missing {missingKeys.length} will-engine field ids (PDF may omit those clauses)
          </summary>
          <p className="mt-2 text-xs text-amber-900/80">
            Keep these ids if you want the built-in will/trust generators to fill automatically:
          </p>
          <p className="mt-1 font-mono text-xs">{missingKeys.join(', ')}</p>
        </details>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="form-name">Form name</Label>
          <Input
            id="form-name"
            className="mt-1 rounded-2xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isDefault}
            readOnly={isDefault}
          />
        </div>
        <div>
          <Label htmlFor="form-desc">Description</Label>
          <Input
            id="form-desc"
            className="mt-1 rounded-2xl"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            disabled={isDefault}
            readOnly={isDefault}
          />
        </div>
      </div>

      {!isDefault ? (
        <div>
          <Label htmlFor="save-note">Save note (version history)</Label>
          <Input
            id="save-note"
            className="mt-1 rounded-2xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Added spouse email question"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_240px_1fr]">
        {/* Sections */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Sections</h2>
            {!isDefault ? (
              <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={addSection}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            ) : null}
          </div>
          <ul className="space-y-1">
            {sections.map((s, i) => (
              <li key={`${s.id}-${i}`}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm ${
                    i === selectedSectionIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                  onClick={() => {
                    setSelectedSectionIdx(i)
                    setSelectedFieldIdx(null)
                  }}
                >
                  <span className="truncate">{s.title || s.id}</span>
                  <span className="ml-2 shrink-0 text-[10px] opacity-70">{s.fields.length}</span>
                </button>
              </li>
            ))}
          </ul>
          {section && !isDefault ? (
            <div className="mt-3 flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full"
                disabled={selectedSectionIdx === 0}
                onClick={() => {
                  setSections((prev) => moveItem(cloneSections(prev), selectedSectionIdx, -1))
                  setSelectedSectionIdx((i) => Math.max(0, i - 1))
                }}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full"
                disabled={selectedSectionIdx >= sections.length - 1}
                onClick={() => {
                  setSections((prev) => moveItem(cloneSections(prev), selectedSectionIdx, 1))
                  setSelectedSectionIdx((i) => Math.min(sections.length - 1, i + 1))
                }}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full text-destructive"
                onClick={() => removeSection(selectedSectionIdx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Fields list */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Questions</h2>
            {!isDefault ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                disabled={!section}
                onClick={addField}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            ) : null}
          </div>
          {section ? (
            <ul className="space-y-1">
              {section.fields.map((f, i) => (
                <li key={`${f.id}-${i}`}>
                  <button
                    type="button"
                    className={`flex w-full flex-col rounded-xl px-2 py-1.5 text-left text-sm ${
                      i === selectedFieldIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    }`}
                    onClick={() => setSelectedFieldIdx(i)}
                  >
                    <span className="truncate">{f.label || f.id}</span>
                    <span className="truncate text-[10px] opacity-70">{f.type}</span>
                  </button>
                </li>
              ))}
              {section.fields.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No questions yet (ok for Review).</p>
              ) : null}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Select a section</p>
          )}
          {section && selectedFieldIdx != null && field && !isDefault ? (
            <div className="mt-3 flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full"
                disabled={selectedFieldIdx === 0}
                onClick={() => {
                  setSections((prev) => {
                    const next = cloneSections(prev)
                    next[selectedSectionIdx] = {
                      ...next[selectedSectionIdx],
                      fields: moveItem([...next[selectedSectionIdx].fields], selectedFieldIdx, -1),
                    }
                    return next
                  })
                  setSelectedFieldIdx((i) => (i == null ? i : Math.max(0, i - 1)))
                }}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full"
                disabled={selectedFieldIdx >= section.fields.length - 1}
                onClick={() => {
                  setSections((prev) => {
                    const next = cloneSections(prev)
                    next[selectedSectionIdx] = {
                      ...next[selectedSectionIdx],
                      fields: moveItem([...next[selectedSectionIdx].fields], selectedFieldIdx, 1),
                    }
                    return next
                  })
                  setSelectedFieldIdx((i) =>
                    i == null ? i : Math.min(section.fields.length - 1, i + 1),
                  )
                }}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full text-destructive"
                onClick={() => removeField(selectedFieldIdx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Detail editor */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <fieldset disabled={isDefault} className="min-w-0 space-y-3 disabled:opacity-90">
          {section && selectedFieldIdx == null ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium">Section settings</h2>
              <div>
                <Label>Title</Label>
                <Input
                  className="mt-1 rounded-2xl"
                  value={section.title}
                  onChange={(e) => updateSection(selectedSectionIdx, { title: e.target.value })}
                />
              </div>
              <div>
                <Label>Intro</Label>
                <Textarea
                  className="mt-1 min-h-24 rounded-2xl"
                  value={section.intro}
                  onChange={(e) => updateSection(selectedSectionIdx, { intro: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(section.requiresTrust)}
                  onCheckedChange={(c) =>
                    updateSection(selectedSectionIdx, { requiresTrust: c === true })
                  }
                />
                Only show when trust add-on is purchased
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(section.isReview)}
                  onCheckedChange={(c) =>
                    updateSection(selectedSectionIdx, { isReview: c === true })
                  }
                />
                Review &amp; submit step
              </label>
            </div>
          ) : null}

          {section && field && selectedFieldIdx != null ? (
            <FieldEditor
              field={field}
              allFields={sections.flatMap((s) => s.fields.map((f) => ({ id: f.id, label: f.label })))}
              onChange={(patch) => updateField(selectedSectionIdx, selectedFieldIdx, patch)}
            />
          ) : null}

          {!section ? (
            <p className="text-sm text-muted-foreground">Select a section to edit.</p>
          ) : null}
          </fieldset>
        </div>
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">About IDs</summary>
        <p className="mt-2">
          Form, section, and question IDs are assigned automatically (UUIDs). You only edit titles,
          labels, and settings — not IDs. The default Texas Will form keeps stable answer keys so
          the PDF builder keeps working.
        </p>
      </details>
    </div>
  )
}

function FieldEditor({
  field,
  allFields,
  onChange,
}: {
  field: Field
  allFields: { id: string; label: string }[]
  onChange: (patch: Partial<Field>) => void
}) {
  const optionsText = (field.options ?? []).map((o) => `${o.value}|${o.label}`).join('\n')
  const showIfField = field.showIf?.field ?? ''
  const showIfEquals = field.showIf?.equals ?? ''

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Question settings</h2>
      {WILL_ENGINE_FIELD_IDS.includes(field.id as (typeof WILL_ENGINE_FIELD_IDS)[number]) ? (
        <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
          Linked to will/trust PDF builder
        </p>
      ) : null}
      <div>
        <Label>Label</Label>
        <Input
          className="mt-1 rounded-2xl"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
      <div>
        <Label>Helper</Label>
        <Input
          className="mt-1 rounded-2xl"
          value={field.helper ?? ''}
          onChange={(e) => onChange({ helper: e.target.value || undefined })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Input type</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
            value={field.type}
            onChange={(e) => onChange({ type: e.target.value as FieldType })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Placeholder</Label>
          <Input
            className="mt-1 rounded-2xl"
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Min length</Label>
          <Input
            type="number"
            className="mt-1 rounded-2xl"
            value={field.minLength ?? ''}
            onChange={(e) =>
              onChange({
                minLength: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </div>
        <div>
          <Label>Max length</Label>
          <Input
            type="number"
            className="mt-1 rounded-2xl"
            value={field.maxLength ?? ''}
            onChange={(e) =>
              onChange({
                maxLength: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={Boolean(field.required)}
          onCheckedChange={(c) => onChange({ required: c === true })}
        />
        Required
      </label>

      {field.type === 'radio' ? (
        <div>
          <Label>Options (one per line: value|Label)</Label>
          <Textarea
            className="mt-1 min-h-28 rounded-2xl font-mono text-xs"
            value={optionsText}
            onChange={(e) => {
              const options = e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [value, ...rest] = line.split('|')
                  const label = rest.join('|').trim() || value
                  return { value: value.trim(), label }
                })
              onChange({ options })
            }}
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-medium">Show if (optional)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Depends on field</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-2xl border border-input bg-background px-2 text-sm"
              value={showIfField}
              onChange={(e) => {
                const v = e.target.value
                if (!v) {
                  onChange({ showIf: undefined })
                  return
                }
                const next: ShowIf = { field: v, equals: showIfEquals || 'yes' }
                onChange({ showIf: next })
              }}
            >
              <option value="">Always visible</option>
              {allFields
                .filter((f) => f.id !== field.id)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label || f.id}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Equals</Label>
            <Input
              className="mt-1 rounded-2xl"
              value={showIfEquals}
              disabled={!showIfField}
              onChange={(e) => {
                if (!showIfField) return
                onChange({ showIf: { field: showIfField, equals: e.target.value } })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
