import {
  ATTACK_SCENARIOS as SCENARIOS,
  DEFAULT_STATE,
  type AttackerScenario,
  type ToolState,
} from './types';

export const ATTACK_SCENARIOS: { value: AttackerScenario; label: string }[] = SCENARIOS.map(
  (s) => ({
    value: s.value,
    label: s.label,
  })
);

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    (v.password === undefined || typeof v.password === 'string') &&
    typeof DEFAULT_STATE !== 'undefined'
  );
}
