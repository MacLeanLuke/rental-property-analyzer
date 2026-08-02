import { track as vendorTrack } from '@vercel/analytics'

export { Analytics } from '@vercel/analytics/react'

/**
 * Every event this app is capable of reporting. Adding a case here is the only
 * way to report anything new, which makes this list the complete, reviewable
 * answer to "what does this app tell its author about me?"
 */
export type AnalyticsEvent =
  | 'property_added'
  | 'property_excel_downloaded'
  | 'comparison_opened'
  | 'comparison_excel_downloaded'
  | 'backup_exported'
  | 'backup_imported'
  | 'outbound_simple_home_builds'

/**
 * Report that something happened. Deliberately accepts no payload argument.
 *
 * The vendor's own track() takes arbitrary properties, and that is exactly the
 * hole we do not want: a caller could pass { purchasePrice } without anyone
 * noticing in review. Narrowing the signature to a bare event name makes
 * leaking a financial value through analytics a type error rather than a
 * judgement call, so the guarantee survives future edits by people who have
 * not read this comment.
 *
 * Note: custom events require a Vercel Pro plan to be collected. On Hobby these
 * calls are accepted and dropped. They are wired up anyway so that switching
 * providers is a change to this file alone, and so history starts accumulating
 * the moment collection is enabled rather than from zero.
 */
export function track(event: AnalyticsEvent): void {
  vendorTrack(event)
}
