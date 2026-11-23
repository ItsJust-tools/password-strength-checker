'use client';

import React from 'react';
import type { AttackerScenario, StrengthLabel, ToolState } from '../types';
import { ATTACK_SCENARIOS } from '../ui-shared';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
  onGenerate?: () => void;
  onRegenerate?: () => void;
}

const STRENGTH_COLORS: Record<StrengthLabel, string> = {
  empty: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'very-weak': 'bg-red-600 text-white',
  weak: 'bg-orange-500 text-white',
  fair: 'bg-amber-500 text-white',
  strong: 'bg-green-500 text-white',
  'very-strong': 'bg-green-700 text-white',
};

const STRENGTH_TITLES: Record<StrengthLabel, string> = {
  empty: 'Ready',
  'very-weak': 'Very weak',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  'very-strong': 'Very strong',
};

function ScenarioSelect({
  value,
  onChangeState,
}: {
  value: AttackerScenario;
  onChangeState: (next: AttackerScenario) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChangeState(e.target.value as AttackerScenario)}
      data-testid="scenario-select"
      aria-label="Attacker scenario"
      className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    >
      {ATTACK_SCENARIOS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onChange,
  onClear,
  onCopy,
  onGenerate,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Password tool controls"
      >
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onGenerate ? (
          <button
            type="button"
            onClick={onGenerate}
            data-testid="btn-generate"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Generate strong password
          </button>
        ) : null}
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy report
          </button>
        ) : null}
        <ScenarioSelect
          value={state.scenario}
          onChangeState={(scenario) => onChange({ ...state, scenario })}
        />
        <span
          data-testid="toolbar-strength-badge"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STRENGTH_COLORS[state.password ? labelOf(state) : 'empty']
          }`}
        >
          {STRENGTH_TITLES[state.password ? labelOf(state) : 'empty']}
        </span>
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};

function labelOf(state: ToolState): StrengthLabel {
  // local helper to avoid a circular import with analysisFor
  const pw = state.password;
  if (!pw) return 'empty';
  const len = [...pw].length;
  const c = {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    sym: /[^a-zA-Z0-9]/.test(pw),
  };
  const pool = (c.lower ? 26 : 0) + (c.upper ? 26 : 0) + (c.digit ? 10 : 0) + (c.sym ? 33 : 0);
  const bits = pool > 1 ? len * Math.log2(pool) : 0;
  if (bits < 28) return 'very-weak';
  if (bits < 40) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 80) return 'strong';
  return 'very-strong';
}
