import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VersionList, type VersionRow } from '@/components/admin/VersionList'
import {
  activatePrompts,
  getPromptsContent,
  getPromptsVersionBody,
  savePrompts,
} from '@/lib/admin-content'

export default function PromptsEditorPage() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [note, setNote] = useState('')
  const [defaults, setDefaults] = useState({ system_prompt: '', user_prompt_template: '' })
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [activeVersionNo, setActiveVersionNo] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    const res = await getPromptsContent()
    setSystemPrompt(res.active.system_prompt)
    setUserPrompt(res.active.user_prompt_template)
    setDefaults(res.defaults)
    setVersions(res.versions)
    setActiveVersionNo(res.active.version_no)
    setLoading(false)
  }

  useEffect(() => {
    refresh().catch((e) => {
      setMsg(e instanceof Error ? e.message : 'Failed to load prompts')
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await savePrompts({
        system_prompt: systemPrompt,
        user_prompt_template: userPrompt,
        note: note || undefined,
      })
      setMsg(`Saved as v${res.version_no} and activated`)
      setNote('')
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function loadVersion(id: string) {
    setLoadingId(id)
    setMsg(null)
    try {
      const row = await getPromptsVersionBody(id)
      setSystemPrompt(row.system_prompt)
      setUserPrompt(row.user_prompt_template)
      setMsg(`Loaded v${row.version_no} into editor — review and Save to apply`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoadingId(null)
    }
  }

  async function activate(id: string) {
    setMsg(null)
    try {
      await activatePrompts(id)
      setMsg('Activated')
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Activate failed')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading AI prompts…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight">AI prompts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active: {activeVersionNo != null ? `v${activeVersionNo}` : 'built-in default'}. The skeleton
          is injected where you put <code className="rounded bg-secondary px-1">{'{{skeleton}}'}</code>,
          and answers where you put{' '}
          <code className="rounded bg-secondary px-1">{'{{answers_json}}'}</code>.
        </p>
      </div>
      {msg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setSystemPrompt(defaults.system_prompt)
                setUserPrompt(defaults.user_prompt_template)
              }}
            >
              Reset to built-in defaults
            </Button>
          </div>
          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[220px] rounded-2xl font-mono text-xs"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label>User prompt template</Label>
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="min-h-[280px] rounded-2xl font-mono text-xs"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompts-note" className="text-xs">
              Note for version history (optional)
            </Label>
            <Input
              id="prompts-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Stronger pour-over instructions"
              className="rounded-2xl"
            />
          </div>
          <Button type="button" className="rounded-full" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save as new version & activate'}
          </Button>
        </div>
        <aside className="space-y-3">
          <h3 className="text-sm font-medium">Version history</h3>
          <VersionList
            versions={versions}
            onLoad={(id) => void loadVersion(id)}
            onActivate={(id) => void activate(id)}
            loadingId={loadingId}
          />
        </aside>
      </div>
    </div>
  )
}
