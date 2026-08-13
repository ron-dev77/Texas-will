import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireAdminAccess, signInAdmin } from '@/lib/admin'
import { supabase } from '@/integrations/supabase/client'

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect')?.startsWith('/') ? params.get('redirect')! : '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Clear legacy demo-admin flag if present
    localStorage.removeItem('myaiwill.admin.demo')

    let alive = true
    requireAdminAccess()
      .then(({ ok }) => {
        if (alive && ok) navigate(redirectTo, { replace: true })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [navigate, redirectTo])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signInAdmin(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      await supabase.auth.signOut().catch(() => undefined)
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,_oklch(0.98_0.01_85)_0%,_var(--background)_55%)] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)]">
        <Link to="/" className="inline-flex text-foreground">
          <Wordmark />
        </Link>
        <h1 className="mt-6 font-serif text-2xl text-foreground">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with an existing verified staff account. New accounts are not created here.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">
              Email<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-10 rounded-2xl"
              placeholder="you@myaiwill.com"
            />
          </div>
          <div>
            <Label htmlFor="password">
              Password<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-2xl pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <EyeOff className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10 w-full rounded-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  )
}
