type Props = {
  className?: string
  showStar?: boolean
}

export function Wordmark({ className, showStar = true }: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 font-serif text-[1.125rem] font-medium tracking-tight leading-none ' +
        (className ?? '')
      }
    >
      {showStar && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 text-accent"
          fill="currentColor"
        >
          <path d="M12 2 14.39 8.26 21 9.27l-4.78 4.66L17.45 21 12 17.77 6.55 21l1.23-7.07L3 9.27l6.61-1.01L12 2z" />
        </svg>
      )}
      <span>My AI Will</span>
    </span>
  )
}
