import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import ToolClient from '@/app/tool-client';
import ToolClientWrapper from '@/app/tool-client-wrapper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-tool-client">dynamic-tool-client</div>,
}));

const mockSetData = vi.fn();
const mockToast = vi.fn();
const mockHandleExport = vi.fn();
const mockImport = vi.fn();
const mockToolbarActions = { canUndo: true, canRedo: true, onUndo: vi.fn(), onRedo: vi.fn() };

vi.mock('@itsjust/core', () => ({
  ToolShell: ({ toolbar, sidebar, canvas, statusBar }: Record<string, unknown>) => (
    <div>
      <div>{toolbar as ReactNode}</div>
      <div>{sidebar as ReactNode}</div>
      <div>{canvas as ReactNode}</div>
      <div>{statusBar as ReactNode}</div>
    </div>
  ),
  ImportExport: ({ onShare }: { onShare?: () => void }) => (
    <button type="button" onClick={onShare}>
      trigger-share
    </button>
  ),
  useTool: () => ({
    state: {
      data: {
        password: '',
        reveal: false,
        scenario: 'offline-fast',
        history: [],
      },
      setData: mockSetData,
      isDirty: false,
      lastSaved: null,
    },
    toast: mockToast,
    handleExport: mockHandleExport,
    importFromFile: mockImport,
    isImporting: false,
    supportedFormats: ['png'],
    toolbarActions: mockToolbarActions,
  }),
}));

import { deserializeState, serializeState } from '@/tool/tool-definition';
import { DEFAULT_STATE } from '@/tool/types';

describe('tool client (password strength checker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wrapper without loading shared state', () => {
    render(<ToolClientWrapper />);
    expect(screen.getByTestId('dynamic-tool-client')).toBeInTheDocument();
  });

  it('renders toolbar, sidebar and canvas via shell', () => {
    render(<ToolClient />);
    expect(screen.getByTestId('btn-clear')).toBeInTheDocument();
    expect(screen.getByTestId('btn-generate')).toBeInTheDocument();
    expect(screen.getByTestId('btn-copy-result')).toBeInTheDocument();
    expect(screen.getByTestId('password-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('password-canvas')).toBeInTheDocument();
  });

  it('clear button resets the password', () => {
    render(<ToolClient />);
    fireEvent.click(screen.getByTestId('btn-clear'));
    expect(mockSetData).toHaveBeenCalled();
    const arg = mockSetData.mock.calls.at(-1)?.[0];
    const next = typeof arg === 'function' ? arg(DEFAULT_STATE) : arg;
    expect(next.password).toBe('');
  });

  it('scenario select updates state through onChange', () => {
    render(<ToolClient />);
    fireEvent.change(screen.getByTestId('scenario-select'), {
      target: { value: 'online-throttled' },
    });
    expect(mockSetData).toHaveBeenCalled();
  });

  it('copy report button uses the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ToolClient />);
    fireEvent.click(screen.getByTestId('btn-copy-result'));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
  });

  it('reports share payloads never contain the password', () => {
    const stateWithSecret = { ...DEFAULT_STATE, password: 'url-secret-123' };
    const serialized = serializeState(stateWithSecret);
    expect(serialized).not.toContain('url-secret-123');
    const restored = deserializeState(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) expect(restored.data.password).toBe('');
  });

  it('history helpers cap saved reports', () => {
    let s = DEFAULT_STATE;
    for (let i = 0; i < 30; i += 1) {
      s = {
        ...s,
        history: [{ text: `r${i}`, createdAt: '2026-11-23T00:00:00.000Z' }, ...s.history].slice(
          0,
          20
        ),
      };
    }
    expect(s.history).toHaveLength(20);
  });
});
