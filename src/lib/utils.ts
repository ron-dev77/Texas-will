import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Embed PDF without browser thumbnail/nav sidebar (Chrome/Edge open params). */
export function pdfEmbedSrc(url: string) {
  const base = url.split('#')[0]
  return `${base}#navpanes=0`
}
