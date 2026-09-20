/** Shared layout for will PDF renderers (skeleton + live will). */

/** @deprecated Use WILL_PDF_MARGIN_X_PT / WILL_PDF_MARGIN_Y_PT */
export const WILL_PDF_MARGIN_PT = 108

/** Side margins — Ron MVP: slightly wider than prior uniform 108pt. */
export const WILL_PDF_MARGIN_X_PT = 120

/** Top/bottom margins — Ron MVP: slightly less vertical white space than 108pt. */
export const WILL_PDF_MARGIN_Y_PT = 90

/** Space reserved above the bottom edge for page numbers (content stops above this). */
export const WILL_PDF_FOOTER_RESERVE_PT = 48

/** Vertical position for centered "Page N" text (above typical printer non-printable zone). */
export const WILL_PDF_PAGE_NUMBER_Y_PT = 84

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
