'use client';

import React from 'react';
import type { ToolState } from '../types';
import { ATTACK_SCENARIOS } from '../ui-shared';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="password-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          How strength is measured
        </h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Entropy = length × log2(character pool).</li>
          <li>Pool: 26 lower + 26 upper + 10 digits + 33 symbols.</li>
          <li>Crack time assumes half the keyspace on average.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Attacker scenarios</h3>
        <ul
          className="space-y-1 text-xs text-gray-600 dark:text-gray-300"
          data-testid="scenario-list"
        >
          {ATTACK_SCENARIOS.map((s) => (
            <li key={s.value} className="flex justify-between gap-2">
              <button
                type="button"
                data-testid={`scenario-option-${s.value}`}
                aria-pressed={state.scenario === s.value}
                onClick={() => onChange({ ...state, scenario: s.value })}
                className={`rounded px-1.5 py-0.5 text-left ${
                  state.scenario === s.value
                    ? 'bg-violet-100 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved reports</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Privacy</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Everything runs locally in your browser. The password is never sent anywhere and is never
          written into share URLs — shared links only carry the scenario and saved report summaries.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>Mod+Shift+C</kbd> — Copy report
          </li>
          <li>
            <kbd>Mod+Shift+R</kbd> — Generate strong password
          </li>
          <li>
            <kbd>Mod+Shift+X</kbd> — Clear
          </li>
          <li>
            <kbd>Mod+Shift+A</kbd> — Toggle reveal
          </li>
        </ul>
      </div>
    </div>
  );
};
