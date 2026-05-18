import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Replay sampling
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out events dari bot/crawler
  beforeSend(event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = event as any
    const userAgent =
      e?.request?.headers?.['User-Agent'] ||
      e?.contexts?.browser?.name ||
      ''
    if (/bot|crawler|spider|crawling|googleother/i.test(String(userAgent))) {
      return null
    }
    return event
  },

  debug: false,
})
