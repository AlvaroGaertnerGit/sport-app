/**
 * A short, synthesized two-tone chime for "timer finished" — no audio
 * file to fetch or bundle (brief §14: no external downloads), just two
 * oscillator nodes through the Web Audio API. One shared `AudioContext`,
 * created lazily and reused. Every function here fails silently if audio
 * is unavailable or blocked — the timer's own visual completion state
 * (see exercise-panel.tsx) is the real signal; sound is only ever
 * reinforcement, never a dependency the workout flow needs (brief §16).
 */

let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!sharedContext) {
    try {
      sharedContext = new AudioContextCtor()
    } catch {
      return null
    }
  }
  return sharedContext
}

/**
 * Call synchronously inside a real user gesture's own event handler (a
 * click, never inside a `useEffect` reacting to one) — mobile Safari/
 * Chrome only allow `resume()` to actually unlock audio when it runs
 * inside that gesture's own call stack (brief §15). Safe to call
 * repeatedly and from several different buttons; a no-op once running.
 */
export function unlockAudioCue(): void {
  const ctx = getContext()
  if (!ctx || ctx.state !== "suspended") return
  ctx.resume().catch(() => {
    // Still blocked — playCompletionChime() below silently no-ops too;
    // the timer itself keeps working regardless (brief §16).
  })
}

/** One short chime, ~250ms, two quick ascending tones. Never throws — a synthesis failure must never interrupt the workout. */
export function playCompletionChime(): void {
  const ctx = getContext()
  if (!ctx || ctx.state !== "running") return
  try {
    const now = ctx.currentTime
    ;[880, 1174.66].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = frequency
      const start = now + i * 0.14
      const end = start + 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.2, start + 0.01)
      gain.gain.linearRampToValueAtTime(0, end)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(end)
    })
  } catch {
    // Never let a synthesis failure break the timer flow.
  }
}
