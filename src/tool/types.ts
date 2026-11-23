import { toolConfig } from './tool.config';

export type AttackerScenario =
  'online-throttled' | 'online-unthrottled' | 'offline-slow' | 'offline-fast';

export interface AttackScenario {
  value: AttackerScenario;
  label: string;
  description: string;
  /** Guesses per second. */
  guessesPerSecond: number;
}

export const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    value: 'online-throttled',
    label: 'Online, rate-limited',
    description: 'Web login limited to 10 attempts per second.',
    guessesPerSecond: 10,
  },
  {
    value: 'online-unthrottled',
    label: 'Online, unthrottled',
    description: 'Fast API endpoints without rate limiting.',
    guessesPerSecond: 1_000,
  },
  {
    value: 'offline-slow',
    label: 'Offline, slow hash',
    description: 'Offline attack against bcrypt/scrypt-style hashes.',
    guessesPerSecond: 10_000,
  },
  {
    value: 'offline-fast',
    label: 'Offline, fast hash',
    description: 'Offline attack against fast hashes (md5/sha) on GPUs.',
    guessesPerSecond: 10_000_000_000,
  },
];

export interface ScenarioOption {
  value: AttackerScenario;
  label: string;
}

export interface ToolState {
  /** The password being analyzed. Kept out of URL state. */
  password: string;
  /** Whether the password text is visible or masked. */
  reveal: boolean;
  /** Selected attacker scenario for crack-time estimates. */
  scenario: AttackerScenario;
  /** Saved summary report entries, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  text: string;
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  password: '',
  reveal: false,
  scenario: 'offline-fast',
  history: [],
};

export const MAX_HISTORY = 20;

/** Character pool size contributed by lowercase letters. */
export const LOWER_POOL = 26;
/** Character pool size contributed by uppercase letters. */
export const UPPER_POOL = 26;
/** Character pool size contributed by digits. */
export const DIGIT_POOL = 10;
/** Character pool size contributed by the common ASCII symbol set. */
export const SYMBOL_POOL = 33;

export interface CharClassBreakdown {
  lower: number;
  upper: number;
  digits: number;
  symbols: number;
  spaces: number;
  others: number;
}

export function charClasses(password: string): CharClassBreakdown {
  const breakdown: CharClassBreakdown = {
    lower: 0,
    upper: 0,
    digits: 0,
    symbols: 0,
    spaces: 0,
    others: 0,
  };
  for (const ch of password) {
    if (/[a-z]/.test(ch)) breakdown.lower += 1;
    else if (/[A-Z]/.test(ch)) breakdown.upper += 1;
    else if (/[0-9]/.test(ch)) breakdown.digits += 1;
    else if (ch === ' ') breakdown.spaces += 1;
    else if (COMMON_SYMBOLS.includes(ch)) breakdown.symbols += 1;
    else breakdown.others += 1;
  }
  return breakdown;
}

/** Common ASCII printable symbols counted in the symbol pool. */
export const COMMON_SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~`\'"\\ ';

/** Effective pool size from used character classes (0 for an empty password). */
export function poolSize(password: string): number {
  const c = charClasses(password);
  let pool = 0;
  if (c.lower > 0) pool += LOWER_POOL;
  if (c.upper > 0) pool += UPPER_POOL;
  if (c.digits > 0) pool += DIGIT_POOL;
  if (c.symbols > 0) pool += SYMBOL_POOL;
  if (c.spaces > 0) pool += 1;
  if (c.others > 0) pool += 100;
  return pool;
}

/** Shannon-style entropy in bits: length * log2(poolSize). */
export function entropyBits(password: string): number {
  const len = [...password].length;
  if (len === 0) return 0;
  const pool = poolSize(password);
  if (pool <= 1) return 0;
  return len * Math.log2(pool);
}

const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  'qwerty',
  'abc123',
  'password1',
  '111111',
  '1234567',
  'dragon',
  'monkey',
  'letmein',
  'welcome',
  'admin',
  'login',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'superman',
  'batman',
  'trustno1',
  'hunter2',
  'passw0rd',
  'p@ssword',
  'qwerty123',
  '1q2w3e4r',
  'zaq12wsx',
  'master',
  'hello',
  'freedom',
  'whatever',
  'qazwsx',
  '654321',
  '555555',
  'lovely',
  '7777777',
  '888888',
  'alphabet',
  'pokemon',
  'starwars',
  'cookie',
  'flower',
  'hottie',
  'loveme',
  'nicholas',
  'computer',
  'internet',
  'samsung',
];

export { COMMON_PASSWORDS };

/** True when the password (case-insensitively) is on the bundled common list. */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.includes(password.toLowerCase());
}

/** True when the password is a common password after a simple leetspeak reverse-map. */
export function isLeetspeakCommon(password: string): boolean {
  const decoded = decodeLeetspeak(password).toLowerCase();
  return COMMON_PASSWORDS.includes(decoded);
}

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'l',
  '(': 'c',
  '+': 't',
};

export function decodeLeetspeak(password: string): string {
  let out = '';
  for (const ch of password) out += LEET_MAP[ch] ?? ch;
  return out;
}

export type PatternKind =
  'sequence' | 'repeat' | 'keyboard-walk' | 'date' | 'year' | 'common-word' | 'leetspeak';

export interface DetectedPattern {
  kind: PatternKind;
  text: string;
  hint: string;
}

/** Left-to-right runs of consecutive characters (a-z, A-Z, 0-9). */
export function findSequences(password: string, minRun = 3): string[] {
  const runs: string[] = [];
  const chars = [...password];
  const cls = (ch: string): string | null => {
    if (/[a-z]/.test(ch)) return 'a-z';
    if (/[A-Z]/.test(ch)) return 'A-Z';
    if (/[0-9]/.test(ch)) return '0-9';
    return null;
  };
  let start = 0;
  while (start < chars.length) {
    const c0 = cls(chars[start] ?? '');
    if (c0 === null) {
      start += 1;
      continue;
    }
    let end = start;
    while (end + 1 < chars.length) {
      const a = (chars[end] ?? '').charCodeAt(0);
      const b = (chars[end + 1] ?? '').charCodeAt(0);
      if (cls(chars[end + 1] ?? '') === c0 && b - a === 1) end += 1;
      else break;
    }
    if (end - start + 1 >= minRun) {
      runs.push(chars.slice(start, end + 1).join(''));
      start = end + 1;
    } else {
      start += 1;
    }
  }
  return runs;
}

/** Runs of the same character repeated min times or more. */
export function findRepeats(password: string, minRun = 3): string[] {
  const runs: string[] = [];
  const chars = [...password];
  let start = 0;
  while (start < chars.length) {
    let end = start;
    while (end + 1 < chars.length && chars[end + 1] === chars[start]) end += 1;
    if (end - start + 1 >= minRun) {
      runs.push(chars.slice(start, end + 1).join(''));
      start = end + 1;
    } else {
      start += 1;
    }
  }
  return runs;
}

/** Keyboard adjacency rows used for walk detection (QWERTY). */
export const KEYBOARD_ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];

function keyboardNeighbors(a: string, b: string): boolean {
  if (a === b) return false;
  for (const row of KEYBOARD_ROWS) {
    const ia = row.indexOf(a);
    const ib = row.indexOf(b);
    if (ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1) return true;
  }
  return false;
}

/** Runs of at least min chars that walk across adjacent keyboard keys. */
export function findKeyboardWalks(password: string, minRun = 4): string[] {
  const chars = [...password.toLowerCase()];
  const walks: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = start;
    while (
      end + 1 < chars.length &&
      keyboardNeighbors(chars[end] ?? '', chars[end + 1] ?? '') &&
      (end === start ||
        !keyboardNeighbors(chars[end - 1] ?? '', chars[end] ?? '') ||
        chars[end - 1] !== chars[end + 1])
    ) {
      // Extend while consecutive keys are adjacent; avoid trivial zig-zag loops
      const prevDir =
        end > start ? directionOf(chars[end - 1] ?? '', chars[end] ?? '', chars[end] ?? '') : null;
      const dir = directionOf(chars[end] ?? '', chars[end + 1] ?? '', chars[end + 1] ?? '');
      if (prevDir !== null && end > start && dir !== prevDir) break;
      end += 1;
    }
    if (end - start + 1 >= minRun) {
      walks.push(chars.slice(start, end + 1).join(''));
      start = end + 1;
    } else {
      start += 1;
    }
  }
  return walks;
}

function directionOf(a: string, b: string, _unused: string): number | null {
  for (const row of KEYBOARD_ROWS) {
    const ia = row.indexOf(a);
    const ib = row.indexOf(b);
    if (ia >= 0 && ib >= 0) {
      if (ib > ia) return 1;
      if (ib < ia) return -1;
      return 0;
    }
  }
  return null;
}

/** Simple, consistent keyboard-walk finder used by analyze(); walks move in one direction along a keyboard row. */
export function keyboardWalks(password: string, minRun = 4): string[] {
  const chars = [...password.toLowerCase()];
  const walks: string[] = [];
  let start = 0;
  while (start < chars.length) {
    if (!onKeyboard(chars[start] ?? '')) {
      start += 1;
      continue;
    }
    let end = start;
    let dir = 0;
    let steps = 0;
    while (end + 1 < chars.length && onKeyboard(chars[end + 1] ?? '')) {
      const d = rowDelta(chars[end] ?? '', chars[end + 1] ?? '');
      if (d === null || (d !== 1 && d !== -1)) break;
      if (steps > 0 && d !== dir) break;
      dir = d;
      steps += 1;
      end += 1;
    }
    if (end - start + 1 >= minRun) {
      walks.push(chars.slice(start, end + 1).join(''));
      start = end + 1;
    } else {
      start += 1;
    }
  }
  return walks;
}

function onKeyboard(ch: string): boolean {
  return KEYBOARD_ROWS.some((row) => row.includes(ch));
}

function rowDelta(a: string, b: string): number | null {
  for (const row of KEYBOARD_ROWS) {
    const ia = row.indexOf(a);
    const ib = row.indexOf(b);
    if (ia >= 0 && ib >= 0) return ib - ia;
  }
  return null;
}

/** Sequences of digits that read like a date: ddmmyy/ddmmyyyy or mmddyy(yyyy). */
export function findDates(password: string): string[] {
  const out: string[] = [];
  const digitRuns = password.match(/\d{4,8}/g) ?? [];
  for (const run of digitRuns) {
    if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2,4}$/.test(run)) {
      out.push(run);
      continue;
    }
    if (/^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{2,4}$/.test(run)) {
      out.push(run);
      continue;
    }
    if (/^\d{6}$/.test(run)) {
      out.push(run);
    }
  }
  return out;
}

/** Standalone four-digit years 1900-2099 (optionally with a word prefix). */
export function findYears(password: string): string[] {
  return password.match(/(?:\D|^)(19|20)\d{2}(?=\D|$)/g)?.map((m) => m.replace(/^\D/, '')) ?? [];
}

/** Common-word (dictionary-lite) matches from the bundled list. */
export function findCommonWords(password: string): string[] {
  const lower = password.toLowerCase();
  return COMMON_PASSWORDS.filter((w) => w.length >= 4 && lower.includes(w));
}

/** Full pattern scan; de-duplicated by kind+text. */
export function findPatterns(password: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const seen = new Set<string>();
  const push = (kind: PatternKind, text: string, hint: string) => {
    const key = `${kind}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push({ kind, text, hint });
  };
  for (const s of findSequences(password)) {
    push('sequence', s, 'Run of consecutive characters that attackers try first.');
  }
  for (const r of findRepeats(password)) {
    push('repeat', r, 'Repeated characters add far less strength than varied ones.');
  }
  for (const w of keyboardWalks(password)) {
    push('keyboard-walk', w, 'Walk along keyboard rows — a classic cracking pattern.');
  }
  for (const d of findDates(password)) {
    push('date', d, 'Looks like a date — easy to guess from personal info.');
  }
  for (const y of findYears(password)) {
    push('year', y, 'Contains a year — very common human pattern.');
  }
  for (const w of findCommonWords(password)) {
    push('common-word', w, 'Built from a common password word.');
  }
  if (isLeetspeakCommon(password) && !isCommonPassword(password)) {
    push('leetspeak', password, 'Leetspeak substitutions of a common password are well known.');
  }
  return patterns;
}

export type StrengthLabel = 'empty' | 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

export interface StrengthVerdict {
  label: StrengthLabel;
  title: string;
  color: string;
  /** Meter fill percentage 0-100. */
  percent: number;
}

export function verdictFor(entropy: number, hasPassword: boolean): StrengthVerdict {
  if (!hasPassword) {
    return { label: 'empty', title: 'No password yet', color: '#9ca3af', percent: 0 };
  }
  if (entropy < 28)
    return { label: 'very-weak', title: 'Very weak', color: '#dc2626', percent: 12 };
  if (entropy < 40) return { label: 'weak', title: 'Weak', color: '#ea580c', percent: 32 };
  if (entropy < 60) return { label: 'fair', title: 'Fair', color: '#d97706', percent: 55 };
  if (entropy < 80) return { label: 'strong', title: 'Strong', color: '#16a34a', percent: 78 };
  return { label: 'very-strong', title: 'Very strong', color: '#15803d', percent: 96 };
}

/** Format a duration in seconds into a human-friendly string. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return 'instant';
  const units: { name: string; secs: number }[] = [
    { name: 'century', secs: 100 * 365.25 * 86400 },
    { name: 'decade', secs: 10 * 365.25 * 86400 },
    { name: 'year', secs: 365.25 * 86400 },
    { name: 'day', secs: 86400 },
    { name: 'hour', secs: 3600 },
    { name: 'minute', secs: 60 },
    { name: 'second', secs: 1 },
  ];
  for (const u of units) {
    if (seconds >= u.secs) {
      const v = seconds / u.secs;
      const rounded = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
      const name = rounded === 1 ? u.name : `${u.name}s`;
      if (u.name === 'century')
        return rounded === 1 ? '1 century' : `${formatCompact(rounded)} centuries`;
      if (u.name === 'decade')
        return rounded === 1 ? '1 decade' : `${formatCompact(rounded)} decades`;
      return `${formatCompact(rounded)} ${name}`;
    }
  }
  return 'instant';
}

function formatCompact(v: number): string {
  if (v >= 1e6) {
    const m = v / 1e6;
    return `${Math.round(m * 10) / 10} trillion`.replace(/trillion$/, 'million');
  }
  if (v >= 1e5) return `${Math.round(v / 1e3)} thousand`;
  if (v >= 1e3) {
    const k = v / 1e3;
    return `${Math.round(k * 10) / 10} thousand`;
  }
  return String(v);
}

/** Estimated crack time string for the given guesses/sec; half the keyspace on average. */
export function crackTimeText(password: string, guessesPerSecond: number): string {
  const bits = entropyBits(password);
  if (bits === 0) return 'instant';
  if (!Number.isFinite(guessesPerSecond) || guessesPerSecond <= 0) return '—';
  const guesses = Math.pow(2, bits) / 2;
  const seconds = clampSeconds(guesses / guessesPerSecond);
  return formatDuration(seconds);
}

/** Guard against Infinity from very high entropy estimates. */
export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return Number.MAX_VALUE;
  return seconds;
}

/** Seconds until 50% of the keyspace would be exhausted. */
export function crackSeconds(password: string, guessesPerSecond: number): number {
  const bits = entropyBits(password);
  if (bits === 0) return 0;
  if (!Number.isFinite(guessesPerSecond) || guessesPerSecond <= 0) return Number.MAX_VALUE;
  return clampSeconds(Math.pow(2, bits) / 2 / guessesPerSecond);
}

export interface FeedbackItem {
  kind: 'error' | 'warning' | 'info' | 'success';
  text: string;
}

export interface Analysis {
  hasPassword: boolean;
  length: number;
  entropy: number;
  pool: number;
  verdict: StrengthVerdict;
  crackTime: string;
  patterns: DetectedPattern[];
  feedback: FeedbackItem[];
  isCommon: boolean;
  summary: string;
}

/** Rules-feedback for length and variety; breach-style like common lists. */
export function analysisFor(state: ToolState): Analysis {
  const pw = state.password;
  const has = pw.length > 0;
  const entropy = entropyBits(pw);
  const pool = poolSize(pw);
  const verdict = verdictFor(entropy, has);
  const scenario = ATTACK_SCENARIOS.find((s) => s.value === state.scenario) ?? ATTACK_SCENARIOS[3];
  if (!scenario) throw new Error('missing scenario');
  const crackTime = has ? crackTimeText(pw, scenario.guessesPerSecond) : '—';
  const patterns = has ? findPatterns(pw) : [];
  const classes = charClasses(pw);
  const usedClasses = [
    classes.lower > 0,
    classes.upper > 0,
    classes.digits > 0,
    classes.symbols + classes.others + classes.spaces > 0,
  ].filter(Boolean).length;

  const feedback: FeedbackItem[] = [];
  if (!has) {
    feedback.push({
      kind: 'info',
      text: 'Type a password to see its strength. Nothing leaves your browser.',
    });
  } else {
    if (isCommonPassword(pw)) {
      feedback.push({
        kind: 'error',
        text: 'This password is on common-password lists — never use it.',
      });
    } else if (isLeetspeakCommon(pw)) {
      feedback.push({
        kind: 'error',
        text: 'Leetspeak variants of common passwords are easy to crack — avoid them.',
      });
    }
    if (pw.length < 8) {
      feedback.push({ kind: 'error', text: 'Use at least 12 characters; 16+ is better.' });
    } else if (pw.length < 12) {
      feedback.push({ kind: 'warning', text: 'Longer is stronger — aim for 12-16+ characters.' });
    } else {
      feedback.push({ kind: 'success', text: `Good length: ${pw.length} characters.` });
    }
    if (usedClasses < 2) {
      feedback.push({
        kind: 'error',
        text: 'Mix character types: upper/lowercase, digits, and symbols.',
      });
    } else if (usedClasses < 4) {
      feedback.push({ kind: 'warning', text: 'Add another character type to grow the pool.' });
    } else {
      feedback.push({ kind: 'success', text: 'Great variety: uses all character classes.' });
    }
    for (const p of patterns) {
      feedback.push({
        kind: 'warning',
        text: `Pattern (${p.kind.replace('-', ' ')}): "${p.text}" — ${p.hint}`,
      });
    }
  }

  const summary = has
    ? `Strength: ${verdict.title} · Entropy: ${entropy.toFixed(1)} bits · Crack time (${scenario.label.toLowerCase()}): ${crackTime}`
    : 'Strength: enter a password to analyze it';

  return {
    hasPassword: has,
    length: [...pw].length,
    entropy,
    pool,
    verdict,
    crackTime,
    patterns,
    feedback,
    isCommon: has ? isCommonPassword(pw) || isLeetspeakCommon(pw) : false,
    summary,
  };
}

/** Multi-line text report used by the copy action. */
export function summaryReport(state: ToolState): string {
  const a = analysisFor(state);
  if (!a.hasPassword) {
    return 'Password Strength Checker\n\nNo password entered.\n';
  }
  const lines = [
    'Password Strength Checker',
    '=========================',
    `Strength: ${a.verdict.title}`,
    `Length: ${a.length} characters`,
    `Character pool: ${a.pool}`,
    `Entropy: ${a.entropy.toFixed(1)} bits`,
    `Estimated crack time: ${a.crackTime}`,
    `Common password: ${a.isCommon ? 'yes' : 'no'}`,
  ];
  if (a.patterns.length > 0) {
    lines.push('', 'Detected patterns:');
    for (const p of a.patterns) lines.push(`  - ${p.kind}: "${p.text}"`);
  }
  lines.push('', 'Suggestions:');
  for (const f of a.feedback) lines.push(`  - ${f.text}`);
  return `${lines.join('\n')}\n`;
}

/** Generate a strong random password with guaranteed class coverage. */
export function generateStrongPassword(length = 20): string {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
  const all = lowers + uppers + digits + symbols;
  const pick = (chars: string): string => chars[secureIndex(chars.length)] ?? chars[0] ?? '';
  const parts = [pick(lowers), pick(uppers), pick(digits), pick(symbols)];
  while (parts.length < Math.max(4, length)) parts.push(pick(all));
  // Fisher-Yates shuffle with secure randomness
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const j = secureIndex(i + 1);
    const a = parts[i] ?? '';
    const b = parts[j] ?? '';
    parts[i] = b;
    parts[j] = a;
  }
  return parts.join('');
}

function secureIndex(max: number): number {
  const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return (buf[0] ?? 0) % max;
  }
  return Math.floor(Math.random() * max);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    (v.password === undefined || typeof v.password === 'string') &&
    (v.scenario === undefined || typeof v.scenario === 'string') &&
    (v.reveal === undefined || typeof v.reveal === 'boolean') &&
    (v.history === undefined || Array.isArray(v.history))
  );
}

export { toolConfig };
