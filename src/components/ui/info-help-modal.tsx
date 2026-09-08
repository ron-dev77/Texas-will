import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export function InfoHelpButton({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground',
          className,
        )}
        aria-label={`Learn more: ${title}`}
      >
        <CircleHelp className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <Modal open={open} title={title} onClose={() => setOpen(false)} className="max-w-lg">
        <div className="space-y-3 text-sm leading-relaxed text-foreground">{children}</div>
      </Modal>
    </>
  )
}
