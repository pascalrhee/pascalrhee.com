// Single source of truth for the view counter's shape.
//
// The Worker imports this at runtime; /about and /projects import it at build
// time. Before this module existed, three files restated these numbers
// independently, so changing the Worker made the architecture diagram silently
// wrong — on the one page whose whole job is explaining the architecture.

/** Width of the rolling window the public count covers. */
export const WINDOW_HOURS = 24;

/**
 * Hour buckets outlive the read window by 6h, so a bucket can never expire
 * out from under a sum that is still counting it.
 */
export const BUCKET_TTL_HOURS = WINDOW_HOURS + 6;

/** What KV is actually given. Seconds — KV's expirationTtl is in seconds. */
export const BUCKET_TTL_SECONDS = BUCKET_TTL_HOURS * 60 * 60;

/**
 * Human-readable key shape, for docs and diagrams.
 * Must stay in step with hourBucketKey() in src/worker/index.ts.
 */
export const KV_KEY_SHAPE = 'views:YYYY-MM-DDTHH';
