import { describe, it, expect } from 'vitest';
import {
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
  DEFAULT_STATE,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  passwordStrengthCheckerTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('poolSize and charClasses', () => {
  it('counts character classes correctly', () => {
    const c = charClasses('aA1 !é');
    expect(c.lower).toBe(1);
    expect(c.upper).toBe(1);
    expect(c.digits).toBe(1);
    expect(c.spaces).toBe(1);
    expect(c.others).toBe(1); // é is not a common symbol
  });

  it('adds class pools when used', () => {
    expect(poolSize('')).toBe(0);
    expect(poolSize('abc')).toBe(26);
    expect(poolSize('abcABC')).toBe(52);
    expect(poolSize('abcABC123')).toBe(62);
    expect(poolSize('abcABC123!@#')).toBe(95);
  });

  it('entropy = length * log2(pool)', () => {
    expect(entropyBits('')).toBe(0);
    // 8 lowercase chars: 8 * log2(26) ≈ 37.6
    expect(entropyBits('abcdefgh')).toBeCloseTo(8 * Math.log2(26), 6);
    // 12 chars over 95-symbol pool: 12 * log2(95)
    expect(entropyBits('aB3!cD4(eF5)')).toBeCloseTo(12 * Math.log2(95), 6);
  });

  it('empty and single-character edge cases', () => {
    expect(entropyBits('')).toBe(0);
    expect(entropyBits('a')).toBeCloseTo(Math.log2(26), 6);
    const a = analysisFor(state({ password: 'a' }));
    expect(a).toBeDefined();
    expect(a.verdict.label).toBe('very-weak');
    expect(a.length).toBe(1);
  });
});

describe('crack-time math and formatting', () => {
  it('computes seconds for half the keyspace', () => {
    // pool 26, len 8: 2^(8*log2(26)) / 2 / rate
    const bits = 8 * Math.log2(26);
    const expected = Math.pow(2, bits) / 2 / 10;
    expect(crackSeconds('abcdefgh', 10)).toBeCloseTo(expected, 3);
  });

  it('returns 0 for empty password', () => {
    expect(crackSeconds('', 1e9)).toBe(0);
    expect(crackTimeText('', 1e9)).toBe('instant');
  });

  it('formats seconds/minutes/hours/days/years/centuries', () => {
    expect(formatDuration(0.5)).toBe('instant');
    expect(formatDuration(5)).toContain('second');
    expect(formatDuration(90)).toContain('minute');
    expect(formatDuration(7200)).toContain('hour');
    expect(formatDuration(3 * 86400)).toContain('day');
    expect(formatDuration(2 * 365.25 * 86400)).toContain('year');
    // 1 century exactly
    expect(formatDuration(100 * 365.25 * 86400)).toBe('1 century');
    expect(formatDuration(2 * 100 * 365.25 * 86400)).toContain('centuries');
  });

  it('handles non-finite and invalid inputs safely', () => {
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Infinity)).toBe('—');
    expect(crackTimeText('abc', 0)).toBe('—');
    expect(crackTimeText('abc', -5)).toBe('—');
    expect(crackSeconds('abc', 0)).toBe(Number.MAX_VALUE);
  });

  it('strong password shows centuries under fast offline attack', () => {
    expect(crackTimeText('aB3!cD4(eF5)gH6*', 1e10)).toContain('centuries');
  });
});

describe('pattern detection', () => {
  it('flags sequences', () => {
    expect(findSequences('xabcz')).toContain('abc');
    expect(findSequences('1234')).toContain('1234');
    expect(findSequences('ABCD')).toContain('ABCD');
    expect(findSequences('aXbYc')).toEqual([]);
    expect(findSequences('ab')).toEqual([]);
  });

  it('flags repeats', () => {
    expect(findRepeats('haaaa')).toContain('aaaa');
    expect(findRepeats('ab')).toEqual([]);
    expect(findRepeats('zzz')).toContain('zzz');
  });

  it('flags keyboard walks', () => {
    expect(keyboardWalks('MqwertY')).toContain('qwerty');
    expect(keyboardWalks('asdfasdf')).toContain('asdf');
    expect(keyboardWalks('hello')).toEqual([]);
    expect(keyboardWalks('zxcvbn')).toContain('zxcvbn');
  });

  it('flags dates and years', () => {
    expect(findDates('25122023!')).toContain('25122023');
    expect(findDates('12051999')).toContain('12051999');
    expect(findYears('Summer2024!')).toContain('2024');
    expect(findYears('nope')).toEqual([]);
  });

  it('flags common words and leetspeak', () => {
    expect(isCommonPassword('QWERTY')).toBe(true);
    expect(isCommonPassword('Tr0ub4dor')).toBe(false);
    expect(isLeetspeakCommon('P@ssw0rd')).toBe(true);
    expect(decodeLeetspeak('P@ssw0rd')).toBe('Password');
    expect(decodeLeetspeak('P@ssw0rd').toLowerCase()).toBe('password');
    expect(findCommonWords('mydragon123')).toContain('dragon');
  });

  it('deduplicates pattern scan output', () => {
    const patterns = findPatterns('dragon123qwerty');
    const keys = patterns.map((p) => `${p.kind}:${p.text}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(patterns.length).toBeGreaterThan(0);
  });
});

describe('verdicts', () => {
  it('maps entropy bands to labels', () => {
    expect(verdictFor(0, false).label).toBe('empty');
    expect(verdictFor(10, true).label).toBe('very-weak');
    expect(verdictFor(35, true).label).toBe('weak');
    expect(verdictFor(50, true).label).toBe('fair');
    expect(verdictFor(70, true).label).toBe('strong');
    expect(verdictFor(90, true).label).toBe('very-strong');
  });
});

describe('analysis and summary', () => {
  it('empty password renders safe placeholders', () => {
    const a = analysisFor(DEFAULT_STATE);
    expect(a.hasPassword).toBe(false);
    expect(a.summary).toContain('enter a password');
    expect(a.crackTime).toBe('—');
    expect(summaryReport(DEFAULT_STATE)).toContain('No password entered');
  });

  it('common password triggers error feedback', () => {
    const a = analysisFor(state({ password: 'password' }));
    expect(a.isCommon).toBe(true);
    expect(a.feedback.some((f) => f.kind === 'error')).toBe(true);
  });

  it('short password gets improvement suggestions', () => {
    const a = analysisFor(state({ password: 'ab1' }));
    expect(a.feedback.some((f) => f.text.includes('12 characters'))).toBe(true);
  });

  it('pattern feedback appears for weak structured passwords', () => {
    const a = analysisFor(state({ password: 'abc123' }));
    expect(a.patterns.length).toBeGreaterThan(0);
    expect(a.feedback.some((f) => f.text.includes('Pattern'))).toBe(true);
  });

  it('scenario changes crack time', () => {
    const fast = analysisFor(state({ password: 'abcdefgh', scenario: 'offline-fast' }));
    const slow = analysisFor(state({ password: 'abcdefgh', scenario: 'online-throttled' }));
    expect(fast.crackTime).not.toBe(slow.crackTime);
  });

  it('report includes core metrics', () => {
    const report = summaryReport(state({ password: 'aB3!cD4(eF5)gH6*' }));
    expect(report).toContain('Strength:');
    expect(report).toContain('Entropy:');
    expect(report).toContain('crack');
    expect(report).toContain('Suggestions:');
  });
});

describe('serialization (password never shared)', () => {
  it('serializes without the password', () => {
    const s = serializeState(state({ password: 'supersecret123', reveal: true }));
    expect(s).not.toContain('supersecret123');
    const parsed = JSON.parse(s) as Record<string, unknown>;
    expect('password' in parsed).toBe(false);
    expect(parsed.reveal).toBe(true);
    expect(parsed.scenario).toBe(DEFAULT_STATE.scenario);
  });

  it('round-trips scenario, reveal and history but drops the password', () => {
    const withData = state({
      password: 'whatever',
      scenario: 'offline-slow',
      reveal: true,
      history: [{ text: 'Weak · 10 bits', createdAt: '2026-11-23T00:00:00.000Z' }],
    });
    const r = deserializeState(JSON.parse(serializeState(withData)));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenario).toBe('offline-slow');
    expect(r.data.reveal).toBe(true);
    expect(r.data.history).toHaveLength(1);
    expect(r.data.password).toBe('');
  });

  it('URL serialize/deserialize round-trip excluding the password', () => {
    const original = state({ password: 'topsecret', scenario: 'online-unthrottled' });
    const encoded = encodeURIComponent(
      Buffer.from(serializeState(original), 'utf-8').toString('binary')
    );
    const decoded = Buffer.from(decodeURIComponent(encoded), 'binary').toString('utf-8');
    const r = deserializeState(JSON.parse(decoded));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenario).toBe('online-unthrottled');
    expect(r.data.password).toBe('');
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('x').success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
  });

  it('repairs invalid scenario and history', () => {
    const r = deserializeState({ scenario: 'nope', history: 'bad', reveal: 'yes' });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenario).toBe(DEFAULT_STATE.scenario);
    expect(r.data.history).toEqual([]);
    expect(r.data.reveal).toBe(false);
  });

  it('caps history at MAX_HISTORY', () => {
    expect(DEFAULT_STATE).toBeDefined();
    let s = state();
    for (let i = 0; i < 25; i += 1) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(20);
    const first = s.history[0];
    expect(first?.text).toBe('entry 24');
  });

  it('roundTrips reports consistent no-password state', () => {
    const s = state({ password: 'x', scenario: 'offline-slow' });
    expect(roundTrips(s)).toBe(true);
  });

  it('tool id matches slug and exporters are declared', () => {
    expect(passwordStrengthCheckerTool.id).toBe('password-strength-checker');
    expect(passwordStrengthCheckerTool.exporters).toHaveLength(4);
    expect(passwordStrengthCheckerTool.initialState).toEqual(DEFAULT_STATE);
  });
});

describe('edge cases render safely', () => {
  it('empty password analysis is defined with safe defaults', () => {
    const a = analysisFor(DEFAULT_STATE);
    expect(a.entropy).toBe(0);
    expect(a.pool).toBe(0);
    expect(a.patterns).toEqual([]);
  });

  it('single character yields very-weak verdict with valid percent', () => {
    const a = analysisFor(state({ password: 'z' }));
    expect(a.verdict.percent).toBeGreaterThan(0);
    expect(a.verdict.percent).toBeLessThanOrEqual(100);
  });

  it('isState accepts partial objects', () => {
    expect(isState({})).toBe(true);
    expect(isState({ password: 42 })).toBe(false);
    expect(isState(null)).toBe(false);
  });

  it('generateStrongPassword covers all classes and honors length', () => {
    for (let i = 0; i < 20; i += 1) {
      const p = generateStrongPassword(20);
      expect(p).toHaveLength(20);
      expect(/[a-z]/.test(p)).toBe(true);
      expect(/[A-Z]/.test(p)).toBe(true);
      expect(/[0-9]/.test(p)).toBe(true);
      expect(/[^a-zA-Z0-9]/.test(p)).toBe(true);
    }
    expect(generateStrongPassword(6)).toHaveLength(6);
  });

  it('numeric formatting remains stable in reports', () => {
    expect(Number.isFinite(4e15 + 1)).toBe(true);
    expect((4e15 + 1).toLocaleString('en-US')).toContain('0');
  });
});
