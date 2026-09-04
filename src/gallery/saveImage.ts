/**
 * Save a data-URL image to the viewer's device. iOS Safari (and some other
 * mobile browsers) silently ignore the HTML `download` attribute on an
 * `<a>` tag -- tapping it just opens or does nothing, which is why
 * "Download" didn't actually save anything on a phone. The Web Share API
 * (sharing an image File) triggers the native share sheet instead, which on
 * iOS/Android includes a "Save Image"/"Save to Photos" option -- that's the
 * correct mobile equivalent of a download. Desktop browsers without share
 * support fall back to the classic anchor-download approach.
 */
export async function saveImage(dataUrl: string, filename: string): Promise<void> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: filename });
      return;
    }
  } catch (e) {
    // AbortError means the user dismissed the share sheet -- not a failure.
    if (e instanceof Error && e.name === "AbortError") return;
    // Otherwise fall through to the anchor-download approach below.
  }

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
