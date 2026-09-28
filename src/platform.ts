/** iPhone/iPad, across every browser -- they're all required by Apple to run
 * on the same underlying WebKit engine, which is what several iOS-specific
 * platform quirks in this app (see spotify/player.ts and audio/analyzer.ts)
 * actually key off, not "Safari" specifically. */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
