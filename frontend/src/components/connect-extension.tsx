"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Puzzle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const STEPS = [
  "Install the CodeQuest Companion extension and open any LeetCode problem.",
  "Click the CodeQuest icon to open the side panel.",
  "Type this code into the panel. It works once and expires in 10 minutes.",
];

/** Shows a single-use pairing code for the CodeQuest Companion browser extension. */
export function ConnectExtension() {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pairing = useMutation({
    mutationFn: async () => ({ ...(await api.extensionPairingCode()), issuedAt: Date.now() }),
    onSuccess: () => {
      setCopied(false);
      setNow(Date.now());
    },
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
    <Card id="extension" aria-labelledby="connect-ext" className="scroll-mt-20 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lc bg-green/15">
          <Puzzle size={20} className="text-green" aria-hidden />
        </span>
        <div>
          <h2 id="connect-ext" className="font-display text-[17px] font-semibold text-text-1">
            LeetCode Companion
          </h2>
          <p className="mt-0.5 text-sm text-text-2">
            Take your mentor to LeetCode: approach checks, concept hints and mistake detection, all feeding your Mistake Memory.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-2">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-text-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-fill-3 text-xs text-text-1">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-lc bg-panel p-4">
        {pairing.data && !expired ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1.5" role="group" aria-label={`Pairing code ${pairing.data.code.split("").join(" ")}`}>
              {pairing.data.code.split("").map((ch, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="grid h-12 w-10 place-items-center rounded-lc-sm bg-fill-2 font-mono text-2xl font-semibold text-text-1 ring-1 ring-line-strong"
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button size="sm" onClick={() => copy(pairing.data.code)}>
                {copied ? <Check size={14} className="text-green" aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? "Copied" : "Copy code"}
              </Button>
              <span className="text-xs tabular-nums text-text-3" aria-live="polite">
                Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => pairing.mutate()} loading={pairing.isPending}>
              {expired ? <RotateCw size={16} aria-hidden /> : <Puzzle size={16} aria-hidden />}
              {pairing.isPending ? "Creating code…" : expired ? "Code expired: get a new one" : "Generate pairing code"}
            </Button>
            <span className="text-xs text-text-3">Codes are single-use and never shown again.</span>
          </div>
        )}
        {pairing.isError && (
          <p role="alert" className="mt-3 text-xs text-red">
            {pairing.error instanceof ApiError ? pairing.error.message : "Could not create a pairing code."}
          </p>
        )}
      </div>
    </Card>
  );
}
