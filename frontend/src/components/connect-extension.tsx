"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Puzzle } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

/** Shows a single-use pairing code for the CodeQuest Companion browser extension. */
export function ConnectExtension() {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pairing = useMutation({
    mutationFn: async () => ({ ...(await api.extensionPairingCode()), issuedAt: Date.now() }),
    onSuccess: () => setCopied(false),
  });

  const expiresAt = pairing.data ? pairing.data.issuedAt + pairing.data.expires_in_s * 1000 : null;
  const secondsLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const expired = !!pairing.data && secondsLeft === 0;

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the code is still visible to type by hand
    }
  }

  return (
    <section aria-labelledby="connect-ext" className="rounded-xl border border-line bg-panel p-4">
      <h2 id="connect-ext" className="flex items-center gap-2 font-semibold">
        <Puzzle size={18} className="text-accent" aria-hidden /> LeetCode Companion
      </h2>
      <p className="mt-1 text-sm text-muted">
        Take your mentor to LeetCode: approach checks, concept hints and mistake detection, all feeding this Mistake Memory.
      </p>
      {pairing.data && !expired ? (
        <div className="mt-3 flex items-center gap-3">
          <code className="rounded-lg bg-panel-2 px-3 py-1.5 font-mono text-lg tracking-[0.3em]" aria-label="Pairing code">
            {pairing.data.code}
          </code>
          <button
            type="button"
            onClick={() => copy(pairing.data.code)}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:text-text"
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : "Copy"}
          </button>
          <span className="text-xs text-muted" aria-live="polite">
            expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => pairing.mutate()}
          disabled={pairing.isPending}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-panel-2 disabled:opacity-50"
        >
          {pairing.isPending ? "Creating code…" : expired ? "Code expired: get a new one" : "Connect the extension"}
        </button>
      )}
      {pairing.isError && (
        <p role="alert" className="mt-2 text-xs text-error">
          {pairing.error instanceof ApiError ? pairing.error.message : "Could not create a pairing code."}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Type the code into the extension&apos;s side panel. It works once and expires in 10 minutes.</p>
    </section>
  );
}
