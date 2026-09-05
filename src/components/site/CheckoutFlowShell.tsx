import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/site/Wordmark'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  /** Right side of header — step label, edit link, etc. */
  headerRight?: ReactNode
  /** Use wider content column (checkout form). */
  wide?: boolean
}

export function CheckoutFlowShell({ children, headerRight, wide }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_oklch(0.98_0.01_85)_0%,_var(--background)_55%)]">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/85 px-5 py-4 backdrop-blur-md">
        <div
          className={cn(
            'mx-auto flex items-center justify-between gap-4',
            wide ? 'max-w-3xl' : 'max-w-[720px]',
          )}
        >
          <Link to="/" className="shrink-0 text-foreground transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          {headerRight ? <div className="shrink-0 text-xs text-muted-foreground">{headerRight}</div> : null}
        </div>
      </header>
      <main
        className={cn(
          'mx-auto w-full flex-1 px-5 py-8 sm:py-10',
          wide ? 'max-w-3xl' : 'max-w-[720px]',
        )}
      >
        {children}
      </main>
    </div>
  )
}
