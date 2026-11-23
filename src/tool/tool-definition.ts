import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  ATTACK_SCENARIOS,
  DEFAULT_STATE,
  MAX_HISTORY,
  analysisFor,
  isState,
  summaryReport,
  type AttackerScenario,
  type HistoryEntry,
  type ToolState,
} from './types';

const VALID_SCENARIOS: AttackerScenario[] = ATTACK_SCENARIOS.map((s) => s.value);

/**
 * Serialize tool state WITHOUT the password. The shared URL must never
 * carry the password itself — only the analysis preferences (scenario,
 * reveal flag) and saved report summary entries.
 */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    version: 1,
    scenario: state.scenario,
    reveal: state.reveal,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown, max = MAX_HISTORY): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, max);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected password strength checker state object',
    };
  }
  const v = data as Record<string, unknown>;
  const scenario: AttackerScenario = VALID_SCENARIOS.includes(v.scenario as AttackerScenario)
    ? (v.scenario as AttackerScenario)
    : DEFAULT_STATE.scenario;
  const state: ToolState = {
    // The password is deliberately never restored from shared/imported state.
    password: '',
    reveal: v.reveal === true,
    scenario,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state (ignoring the never-shared password). */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    if (!restored.success) return false;
    const reserialized = serializeState(restored.data);
    const again = deserializeState(JSON.parse(reserialized));
    return again.success && JSON.stringify(again.data) === JSON.stringify(restored.data);
  } catch {
    return false;
  }
}

/** Full summary report text for the current state. */
export function reportText(state: ToolState): string {
  return summaryReport(state);
}

/** Analysis of the current password for UI binding. */
export function analyze(state: ToolState) {
  return analysisFor(state);
}

export const passwordStrengthCheckerTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { isState, DEFAULT_STATE, MAX_HISTORY, analysisFor, summaryReport };
export type { ToolState };
