import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowRight,
  BadgeDollarSign,
  CircleHelp,
  FileCheck2,
  Home,
  Menu,
  Route,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from './Wordmark'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/how-it-works', label: 'How it works', Icon: Route, end: false },
  { to: '/what-you-get', label: 'What you get', Icon: FileCheck2, end: false },
  { to: '/pricing', label: 'Pricing', Icon: BadgeDollarSign, end: false },
  { to: '/faq', label: 'FAQ', Icon: CircleHelp, end: false },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="shrink-0 text-foreground transition-opacity hover:opacity-80"
          onClick={() => setOpen(false)}
        >
          <Wordmark />
        </Link>

        <nav
          aria-label="Primary"
          className="mx-auto hidden items-center rounded-full border border-border/80 bg-card/70 p-1 shadow-[0_1px_0_rgba(15,23,42,0.04)] md:flex"
        >
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors duration-200',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <Icon className="h-3.5 w-3.5 opacity-80" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-full bg-primary px-4 transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          >
            <Link to="/pricing?plan=individual#checkout">
              Start my will
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition duration-200 hover:border-accent hover:bg-accent hover:text-accent-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Menu className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border/60 bg-background transition-[max-height,opacity] duration-300 md:hidden',
          open ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
          <nav aria-label="Mobile" className="flex flex-col gap-1.5">
            {NAV.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-3 rounded-xl px-3 py-3 text-base transition duration-200',
                    isActive
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
                onClick={() => setOpen(false)}
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-card text-accent ring-1 ring-border/70">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                {label}
              </NavLink>
            ))}
            <Button
              asChild
              className="mt-2 h-11 gap-1.5 rounded-full bg-primary transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
            >
              <Link to="/pricing?plan=individual#checkout" onClick={() => setOpen(false)}>
                Start my will
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
