import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHero, PageSection } from '@/components/site/PageShell'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { isValidUsZip, notaryMapsSearchUrl } from '@/lib/notary'

export default function NotaryPage() {
  const [params] = useSearchParams()
  const [zip, setZip] = useState(() => {
    const q = params.get('zip')?.trim() ?? ''
    return isValidUsZip(q) ? q : ''
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = params.get('zip')?.trim() ?? ''
    if (isValidUsZip(q)) setZip(q)
  }, [params])

  function openMaps(e?: React.FormEvent) {
    e?.preventDefault()
    const z = zip.trim()
    if (z && !isValidUsZip(z)) {
      setError('Enter a valid 5-digit U.S. ZIP code.')
      return
    }
    setError(null)
    window.open(notaryMapsSearchUrl(z || null), '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <PageHero
        eyebrow="Notary"
        title="Find a notary near you."
        description="Texas wills use a self-proving affidavit that should be notarized. Enter your ZIP code to open Google Maps with local notaries."
      />

      <PageSection className="py-14 sm:py-20">
        <ScrollReveal variant="up">
          <div className="mx-auto max-w-lg rounded-[2rem] border border-border/70 bg-card p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.22)] sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-accent">
              <MapPin className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="mt-4 font-serif text-2xl text-foreground">Notary near me</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We recommend notarizing the self-proving affidavit when you sign with your witnesses.
              This opens Google Maps — My AI Will does not book or endorse specific notaries.
            </p>

            <form className="mt-6 space-y-4" onSubmit={openMaps}>
              <div>
                <Label htmlFor="notary-zip">ZIP code</Label>
                <Input
                  id="notary-zip"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  placeholder="e.g. 78701"
                  className="mt-1.5 rounded-2xl"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, '').slice(0, 5))
                    setError(null)
                  }}
                />
                {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
              </div>
              <Button type="submit" className="w-full rounded-full gap-2">
                <Search className="h-4 w-4" />
                Search Google Maps
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-full"
                onClick={() => {
                  setZip('')
                  setError(null)
                  window.open(notaryMapsSearchUrl(null), '_blank', 'noopener,noreferrer')
                }}
              >
                Search “Notary near me” (use my location)
              </Button>
            </form>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Tip: banks, UPS stores, and many shipping centers offer notary services. Call ahead to
              confirm hours and ID requirements.
            </p>
          </div>
        </ScrollReveal>
      </PageSection>
    </>
  )
}
