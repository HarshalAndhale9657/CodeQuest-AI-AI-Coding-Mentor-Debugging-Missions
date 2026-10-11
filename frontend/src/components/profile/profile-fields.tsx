"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { GoalId, LevelId, ProfileInput, ProfileView } from "@/lib/types";
import { cx } from "../ui/cx";
import { Switch } from "../ui/switch";

export const GOAL_HINT: Record<GoalId, string> = {
  learn_python: "Write clean Python and solve beginner problems with confidence.",
  service_placement: "Pass the coding round of service-company placements.",
  product_placement: "Clear DSA interviews at product companies.",
  faang: "Hard DSA interviews at top tech companies.",
  competitive: "Contest problem solving on Codeforces and LeetCode contests.",
};

export const DEFAULT_PROFILE: ProfileInput = {
  goal: "product_placement",
  deadline_weeks: 12,
  hours_per_week: 8,
  level: "basics",
  premium_ok: false,
  comfortable: [],
};

/** Form state seeded from the saved profile (or sensible defaults for a new learner). */
export function draftFrom(view: ProfileView): ProfileInput {
  const p = view.profile;
  const base = p
    ? {
        goal: p.goal,
        deadline_weeks: p.deadline_weeks,
        hours_per_week: p.hours_per_week,
        level: p.level,
        premium_ok: p.premium_ok,
        comfortable: p.comfortable,
      }
    : DEFAULT_PROFILE;
  return { ...base, name: view.name === "Guest" ? "" : view.name };
}

type Patch = (patch: Partial<ProfileInput>) => void;

export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-1">
        {children}
      </label>
      {hint && <p className="mt-0.5 text-xs text-text-3">{hint}</p>}
    </div>
  );
}

function ChoiceCard({ selected, onSelect, title, text }: { selected: boolean; onSelect: () => void; title: string; text?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex w-full items-start gap-3 rounded-lc border px-3.5 py-3 text-left transition-colors",
        selected ? "border-brand bg-brand/10" : "border-line-strong bg-panel hover:bg-hover",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-brand bg-brand text-bg" : "border-line-strong",
        )}
      >
        {selected && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-1">{title}</span>
        {text && <span className="mt-0.5 block text-xs text-text-2">{text}</span>}
      </span>
    </button>
  );
}

export function NameField({ draft, patch }: { draft: ProfileInput; patch: Patch }) {
  return (
    <div>
      <FieldLabel htmlFor="profile-name" hint="Shown on your public portfolio. A first name is plenty.">
        What should we call you?
      </FieldLabel>
      <input
        id="profile-name"
        type="text"
        autoComplete="given-name"
        maxLength={40}
        value={draft.name ?? ""}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="Your name"
        className="h-10 w-full rounded-lc-sm bg-fill-2 px-3 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
      />
    </div>
  );
}

export function GoalField({ draft, patch, view }: { draft: ProfileInput; patch: Patch; view: ProfileView }) {
  return (
    <div>
      <FieldLabel hint="Your roadmap covers exactly the topics this goal needs.">What are you preparing for?</FieldLabel>
      <div role="radiogroup" aria-label="Goal" className="grid gap-2 sm:grid-cols-2">
        {view.options.goals.map((g) => (
          <ChoiceCard key={g.id} selected={draft.goal === g.id} onSelect={() => patch({ goal: g.id })} title={g.label} text={GOAL_HINT[g.id]} />
        ))}
      </div>
    </div>
  );
}

export function TimeFields({ draft, patch }: { draft: ProfileInput; patch: Patch }) {
  const hasDeadline = draft.deadline_weeks !== null;
  return (
    <div className="space-y-6">
      <div>
        <FieldLabel htmlFor="profile-hours" hint="Be honest: a plan you can keep beats an ambitious one you drop.">
          Hours per week
        </FieldLabel>
        <div className="flex items-center gap-4">
          <input
            id="profile-hours"
            type="range"
            min={1}
            max={40}
            value={draft.hours_per_week}
            onChange={(e) => patch({ hours_per_week: Number(e.target.value) })}
            className="h-2 flex-1 cursor-pointer accent-brand"
          />
          <output htmlFor="profile-hours" className="w-20 text-right text-sm font-semibold tabular-nums text-text-1">
            {draft.hours_per_week} h/week
          </output>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <FieldLabel htmlFor="profile-deadline" hint="Placement season, an interview date, or none at all.">
            Do you have a deadline?
          </FieldLabel>
          <Switch
            label="I have a deadline"
            checked={hasDeadline}
            onChange={(on) => patch({ deadline_weeks: on ? (draft.deadline_weeks ?? 12) : null })}
          />
        </div>
        {hasDeadline ? (
          <div className="flex items-center gap-4">
            <input
              id="profile-deadline"
              type="range"
              min={2}
              max={26}
              value={draft.deadline_weeks ?? 12}
              onChange={(e) => patch({ deadline_weeks: Number(e.target.value) })}
              className="h-2 flex-1 cursor-pointer accent-brand"
            />
            <output htmlFor="profile-deadline" className="w-20 text-right text-sm font-semibold tabular-nums text-text-1">
              {draft.deadline_weeks} weeks
            </output>
          </div>
        ) : (
          <p className="text-xs text-text-3">No deadline: the plan runs at your own pace.</p>
        )}
      </div>
    </div>
  );
}

export function LevelField({ draft, patch, view }: { draft: ProfileInput; patch: Patch; view: ProfileView }) {
  return (
    <div>
      <FieldLabel hint="This is only a starting point. Your solved missions quickly replace it with real evidence.">
        Where are you right now?
      </FieldLabel>
      <div role="radiogroup" aria-label="Level" className="grid gap-2">
        {view.options.levels.map((l) => (
          <ChoiceCard key={l.id} selected={draft.level === (l.id as LevelId)} onSelect={() => patch({ level: l.id })} title={l.label} />
        ))}
      </div>
    </div>
  );
}

export function TopicsField({ draft, patch, view }: { draft: ProfileInput; patch: Patch; view: ProfileView }) {
  const toggle = (id: string) =>
    patch({ comfortable: draft.comfortable.includes(id) ? draft.comfortable.filter((t) => t !== id) : [...draft.comfortable, id] });
  const groups: { layer: "python" | "dsa"; title: string }[] = [
    { layer: "python", title: "Python foundations" },
    { layer: "dsa", title: "Data structures & algorithms" },
  ];
  return (
    <div>
      <FieldLabel hint="Optional. Your plan spends less time on these. Mastery still has to be proven on CodeQuest.">
        Topics you&apos;re already comfortable with
      </FieldLabel>
      <div className="space-y-3">
        {groups.map((g) => (
          <fieldset key={g.layer}>
            <legend className="mb-1.5 text-xs text-text-3">{g.title}</legend>
            <div className="flex flex-wrap gap-2">
              {view.options.topics
                .filter((t) => t.layer === g.layer)
                .map((t) => {
                  const on = draft.comfortable.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                      className={cx(
                        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
                        on ? "bg-brand text-bg" : "bg-fill-3 text-text-1 hover:bg-tile",
                      )}
                    >
                      {on && <Check size={12} strokeWidth={3} aria-hidden />}
                      {t.label}
                    </button>
                  );
                })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

export function PremiumField({ draft, patch }: { draft: ProfileInput; patch: Patch }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lc bg-panel px-4 py-3">
      <div>
        <p className="text-sm font-medium text-text-1">I have LeetCode Premium</p>
        <p className="mt-0.5 text-xs text-text-3">Without it, your roadmap only links to free problems.</p>
      </div>
      <Switch label="I have LeetCode Premium" checked={draft.premium_ok} onChange={(on) => patch({ premium_ok: on })} />
    </div>
  );
}

export function PrivacyNote() {
  return (
    <p className="text-xs leading-relaxed text-text-3">
      We only ask what changes your plan: no email, phone, college, date of birth or CGPA. You can export or delete everything in
      Settings at any time.
    </p>
  );
}

/** The trimmed name, or undefined so the server keeps the current one. */
export function cleanInput(draft: ProfileInput): ProfileInput {
  const name = (draft.name ?? "").replace(/\s+/g, " ").trim();
  return { ...draft, name: name || undefined };
}
