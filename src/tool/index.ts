export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  passwordStrengthCheckerTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  reportText,
  analyze,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { ATTACK_SCENARIOS } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
  entropyBits,
  poolSize,
  charClasses,
  crackSeconds,
  crackTimeText,
  formatDuration,
  findPatterns,
  findSequences,
  findRepeats,
  keyboardWalks,
  findDates,
  findYears,
  findCommonWords,
  isCommonPassword,
  isLeetspeakCommon,
  decodeLeetspeak,
  verdictFor,
  analysisFor,
  summaryReport,
  generateStrongPassword,
  isState,
} from './types';
export type {
  AttackerScenario,
  Analysis,
  DetectedPattern,
  FeedbackItem,
  HistoryEntry,
  StrengthLabel,
  StrengthVerdict,
  ToolState,
} from './types';
