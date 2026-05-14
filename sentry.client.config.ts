import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Replay sampling
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  debug: false,
})
