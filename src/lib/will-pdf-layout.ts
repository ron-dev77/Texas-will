/** Shared layout for will PDF renderers (skeleton + live will). */

/** ~1.5 inch margins (Scott: room for footers on printed PDF). */
export const WILL_PDF_MARGIN_PT = 108

/** Space reserved above the bottom edge for page numbers (content stops above this). */
export const WILL_PDF_FOOTER_RESERVE_PT = 52

/** Vertical position for centered "Page N" text (above typical printer non-printable zone). */
export const WILL_PDF_PAGE_NUMBER_Y_PT = 68

/** Extra gap after the document title before the opening paragraph. */
export const WILL_PDF_TITLE_GAP_PT = 28

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

/** Page gets a footer number (continuous through notary tail; affidavit marker kept for layout only). */
export function shouldNumberWillPdfPage(
  _pageIndex: number,
  _firstAffidavitPageIndex: number | null,
): boolean {
  return true
}
