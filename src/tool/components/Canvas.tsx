'use client';

import React from 'react';
import { analysisFor } from '../tool-definition';
import { ATTACK_SCENARIOS, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const FEEDBACK_STYLES: Record<string, string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
  success:
    'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200',
};

const FEEDBACK_ICONS: Record<string, string> = {
  error: '✕',
  warning: '!',
  info: 'i',
  success: '✓',
};

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const analysis = analysisFor(state);
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const pwLength = React.useMemo(() => [...state.password].length, [state.password]);
  const scenario = ATTACK_SCENARIOS.find((s) => s.value === state.scenario);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="password-canvas">
      <div>
        <label
          htmlFor="password-input"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Password to check
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="password-input"
            type={state.reveal ? 'text' : 'password'}
            value={state.password}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-sensitive="true"
            data-testid="password-input"
            onChange={(e) => update({ password: e.target.value })}
            placeholder="Type or generate a password"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => update({ reveal: !state.reveal })}
            data-testid="btn-reveal"
            aria-label={state.reveal ? 'Hide password' : 'Show password'}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {state.reveal ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" data-testid="privacy-note">
          Checked entirely in your browser — nothing is uploaded, logged, or stored on a server.
        </p>
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="strength-card"
        role="status"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Strength
          </span>
          <span
            data-testid="strength-label"
            className="text-sm font-semibold"
            style={{ color: analysis.verdict.color }}
          >
            {analysis.verdict.title}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={analysis.verdict.percent}
          aria-label="Password strength meter"
          data-testid="strength-meter"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${analysis.verdict.percent}%`,
              backgroundColor: analysis.verdict.color,
            }}
            data-testid="strength-meter-fill"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="metrics">
          <Metric label="Length" value={String(analysis.length)} testid="metric-length" />
          <Metric label="Pool" value={String(analysis.pool)} testid="metric-pool" />
          <Metric
            label="Entropy"
            value={`${analysis.entropy.toFixed(1)} bits`}
            testid="metric-entropy"
          />
          <Metric
            label="Crack time"
            value={analysis.hasPassword ? analysis.crackTime : '—'}
            testid="metric-crack-time"
          />
        </div>
        {scenario ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="scenario-note">
            Scenario: {scenario.description}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Detected patterns
        </h3>
        {analysis.patterns.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="patterns-empty">
            {analysis.hasPassword
              ? 'No common patterns detected.'
              : 'Patterns like sequences, repeats, keyboard walks, dates, and leetspeak appear here.'}
          </p>
        ) : (
          <ul className="space-y-1" data-testid="patterns-list">
            {analysis.patterns.map((p, i) => (
              <li
                key={`${p.kind}-${p.text}-${i}`}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <span className="font-mono font-semibold">{p.text}</span> —{' '}
                {p.kind.replace('-', ' ')}: {p.hint}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Feedback &amp; suggestions
        </h3>
        <ul className="space-y-1.5" data-testid="feedback-list">
          {analysis.feedback.map((f, i) => (
            <li
              key={`${f.kind}-${f.text}-${i}`}
              className={`flex items-start gap-2 rounded-md border px-3 py-1.5 text-xs ${FEEDBACK_STYLES[f.kind]}`}
              data-testid="feedback-item"
            >
              <span aria-hidden className="font-bold">
                {FEEDBACK_ICONS[f.kind]}
              </span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Summary report
        </h3>
        <pre
          className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-gray-300"
          data-testid="summary-report"
        >
          {analysis.summary}
        </pre>
        {analysis.hasPassword ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() =>
              onSaveHistory?.(
                `${analysis.verdict.title} · ${analysis.entropy.toFixed(1)} bits · crack in ${analysis.crackTime}`
              )
            }
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved reports yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        {pwLength === 0
          ? 'Start typing to analyze a password.'
          : `${pwLength} characters analyzed locally.`}
      </p>
    </div>
  );
};

function Metric({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-center dark:border-gray-800 dark:bg-gray-900/60">
      <span className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="block font-mono text-sm font-semibold" data-testid={testid}>
        {value}
      </span>
    </div>
  );
}
