// Vitest-only stand-in for the real `server-only` package (see
// vitest.config.ts). The real package unconditionally throws unless
// bundled with Next's `react-server` condition, which Vitest doesn't set
// -- this stub makes `import "server-only"` a no-op under tests without
// touching the guard Next actually enforces in the app itself.
export {};
