/** iPhone/iPad, across every browser -- they're all required by Apple to run
 * on the same underlying WebKit engine, which is what an iOS-specific
 * platform quirk in this app (see audio/analyzer.ts) actually keys off, not
 * "Safari" specifically. */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
