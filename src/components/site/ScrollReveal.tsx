import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RevealVariant = 'up' | 'fade' | 'left' | 'right' | 'scale'

type Props = {
  children: ReactNode
  className?: string
  variant?: RevealVariant
  delay?: number
  once?: boolean
}

const variantClass: Record<RevealVariant, string> = {
  up: 'reveal-up',
  fade: 'reveal-fade',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
}

type Phase = 'ssr' | 'ready' | 'shown'

export function ScrollReveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('ssr')

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('shown')
      return
    }

    let cancelled = false
    let observer: IntersectionObserver | null = null

    const arm = window.requestAnimationFrame(() => {
      if (cancelled) return
      setPhase('ready')

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          setPhase('shown')
          if (once) observer?.disconnect()
        },
        { threshold: 0.18, rootMargin: '0px 0px -48px 0px' },
      )

      observer.observe(node)

      window.requestAnimationFrame(() => {
        if (cancelled) return
        const rect = node.getBoundingClientRect()
        const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0
        if (inView) setPhase('shown')
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(arm)
      observer?.disconnect()
    }
  }, [once])

  return (
    <div
      ref={ref}
      className={cn(
        phase !== 'ssr' && 'reveal-base',
        phase !== 'ssr' && variantClass[variant],
        (phase === 'ssr' || phase === 'shown') && 'reveal-visible',
        className,
      )}
      style={phase !== 'ssr' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
