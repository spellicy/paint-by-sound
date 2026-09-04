import { useState } from "react";

export function ConceptPanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-stone-300 hover:text-stone-100"
      >
        <span>About this concept &mdash; Paint by Sound</span>
        <span className="text-stone-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-800 px-5 py-4 text-sm leading-relaxed text-stone-400">
          <p>
            &ldquo;The eyes are made for astronomy, the ears for harmony, and these are
            sister sciences.&rdquo; &mdash; Wassily Kandinsky
          </p>
          <p>
            <strong className="text-stone-300">Paint by Sound</strong> imagines an
            AI-driven exhibit where a robotic arm paints abstract, modern-art canvases
            live, guided entirely by music &mdash; notes mapped to color and palette,
            rhythm and dynamics mapped to brushstroke and gesture, in the spirit of
            Rothko, Pollock, de Kooning and the postwar painters who carried
            abstraction from gesture and color-field into minimalism.
          </p>
          <p>
            This app is a browser-based simulator of that idea: it listens to whatever
            audio you play (or your microphone), detects pitch, loudness and timbre in
            real time, and drives a virtual brush across the canvas exactly as the
            physical installation would drive a robotic arm. Every session builds one
            continuous painting, and finished pieces can be saved to the gallery below
            &mdash; a small catalog of what the machine has &ldquo;heard.&rdquo;
          </p>
        </div>
      )}
    </section>
  );
}
