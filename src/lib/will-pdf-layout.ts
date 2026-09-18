/** Shared layout for will PDF renderers (skeleton + live will). */

/** ~1.25 inch margins (Ron: enlarge sides, top, bottom beyond prior ~20mm layout). */
export const WILL_PDF_MARGIN_PT = 90

/** Footer numbering stops at self-proving affidavit (or notary-only execution tail). */
export function isWillPdfPageNumberingStopHeading(heading: string): boolean {
  const h = heading.trim().toLowerCase()
  if (/^self[-\s]?proving affidavit\b/.test(h)) return true
  if (/^notary acknowledgment\b/.test(h)) return true
  return false
}

/** @deprecated Use isWillPdfPageNumberingStopHeading */
export function isSelfProvingAffidavitHeading(heading: string): boolean {
  return isWillPdfPageNumberingStopHeading(heading)
}

/** Page gets a footer number if it is before the self-proving affidavit block. */
export function shouldNumberWillPdfPage(
  pageIndex: number,
  firstAffidavitPageIndex: number | null,
): boolean {
  if (firstAffidavitPageIndex === null) return true
  return pageIndex < firstAffidavitPageIndex
}
