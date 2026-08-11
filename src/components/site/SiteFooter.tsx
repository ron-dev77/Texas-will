import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            The first AI-powered will platform built for Texas. Every will reviewed by a licensed
            Texas attorney before it reaches you.
          </p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
            My AI Will is not a law firm and does not provide legal advice. We are a software
            service that produces a Texas-compliant will template reviewed by a licensed Texas
            attorney. Use of this service does not create an attorney-client relationship.
          </p>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Product
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/what-you-get" className="hover:text-foreground">
                What you get
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-foreground">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Company
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/disclaimer" className="hover:text-foreground">
                Disclaimer
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8">
          <span>© {new Date().getFullYear()} My AI Will. Built in Texas.</span>
          <span>Attorney review included on every order.</span>
        </div>
      </div>
    </footer>
  )
}
