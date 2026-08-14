import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Eye, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  activateForm,
  createForm,
  deleteForm,
  duplicateForm,
  listForms,
  type QuestionnaireFormSummary,
} from '@/lib/admin-forms'

export default function QuestionnaireFormsPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<QuestionnaireFormSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  async function refresh() {
    const rows = await listForms()
    setForms(rows)
    setLoading(false)
  }

  useEffect(() => {
    refresh().catch((e) => {
      setMsg(e instanceof Error ? e.message : 'Failed to load forms')
      setLoading(false)
    })
  }, [])

  async function onCreate() {
    setBusy('create')
    setMsg(null)
    try {
      const form = await createForm({
        name: newName.trim() || 'New questionnaire',
        fromDefault: true,
      })
      setNewName('')
      setMsg(`Created “${form.name}” with linked document templates`)
      await refresh()
      navigate(`/admin/content/skeleton?formId=${form.id}&kind=will`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(null)
    }
  }

  async function onDuplicate(id: string) {
    setBusy(`dup-${id}`)
    setMsg(null)
    try {
      const form = await duplicateForm(id)
      setMsg(`Duplicated as “${form.name}”`)
      await refresh()
      navigate(`/admin/content/questionnaire/${form.id}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Duplicate failed')
    } finally {
      setBusy(null)
    }
  }

  async function onActivate(id: string) {
    setBusy(`act-${id}`)
    setMsg(null)
    try {
      await activateForm(id)
      setMsg('Form activated for the live questionnaire')
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Activate failed')
    } finally {
      setBusy(null)
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`Delete questionnaire “${name}”? This cannot be undone.`)) return
    setBusy(`del-${id}`)
    setMsg(null)
    try {
      await deleteForm(id)
      setMsg('Form deleted')
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading forms…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Questionnaire</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Create a form — document templates (will, trust, ancillaries) are linked automatically.
          Finish templates under <strong>Document templates</strong>, then Activate. Only one form
          can be live.
        </p>
      </div>

      {msg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="new-form-name" className="text-xs font-medium text-muted-foreground">
            New form name
          </label>
          <input
            id="new-form-name"
            className="mt-1 flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Soft-launch questionnaire"
          />
        </div>
        <Button
          type="button"
          className="rounded-full"
          disabled={busy !== null}
          onClick={() => void onCreate()}
        >
          <Plus className="h-4 w-4" />
          {busy === 'create' ? 'Creating…' : 'Create from default'}
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {forms.map((form) => (
          <li
            key={form.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/admin/content/questionnaire/${form.id}`}
                  className="font-medium hover:underline"
                >
                  {form.name}
                </Link>
                {form.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    Active
                  </span>
                ) : null}
                {form.is_default ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Default · locked
                  </span>
                ) : null}
              </div>
              {form.description ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{form.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(form.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="rounded-full" asChild>
                <Link to={`/admin/content/skeleton?formId=${form.id}&kind=will`}>
                  Templates
                </Link>
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-full" asChild>
                <Link to={`/admin/content/questionnaire/${form.id}`}>
                  {form.is_default ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                  {form.is_default ? 'View' : 'Questions'}
                </Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={busy !== null}
                onClick={() => void onDuplicate(form.id)}
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </Button>
              {!form.is_active ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={busy !== null}
                  onClick={() => void onActivate(form.id)}
                >
                  <Power className="h-3.5 w-3.5" />
                  Activate
                </Button>
              ) : null}
              {!form.is_default ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-destructive"
                  disabled={busy !== null || form.is_active}
                  onClick={() => void onDelete(form.id, form.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
