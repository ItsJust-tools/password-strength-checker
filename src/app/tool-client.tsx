'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { toolConfig, templateBaseVersion, Canvas, Toolbar, Sidebar } from '@/tool';
import { passwordStrengthCheckerTool, reportText, withHistory } from '@/tool/tool-definition';
import { generateStrongPassword, type ToolState } from '@/tool/types';

export default function ToolClient() {
  const ToolShellCompat = ToolShell as unknown as ComponentType<Record<string, unknown>> & {
    Toolbar?: ComponentType<{ children?: ReactNode }>;
    Body?: ComponentType<{ children?: ReactNode }>;
    Sidebar?: ComponentType<{ children?: ReactNode }>;
    Canvas?: ComponentType<{ children?: ReactNode }>;
    StatusBar?: ComponentType<{ children?: ReactNode }>;
  };
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool<ToolState>(passwordStrengthCheckerTool, canvasRef);
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );

  const title = toolConfig.name;
  const state = tool.state.data;

  const handleStateChange = useCallback(
    (updater: (prev: ToolState) => ToolState) => {
      setToolData(updater);
    },
    [setToolData]
  );

  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get('state');
    if (!encodedState) return;
    try {
      const serialized = decompressFromEncodedURIComponent(encodedState);
      if (!serialized) throw new Error('Invalid shared URL');
      const parsed: unknown = JSON.parse(serialized);
      const deserialized = passwordStrengthCheckerTool.deserialize(parsed);
      if (!deserialized.success) throw new Error(deserialized.error);
      // Shared state never restores a password — only scenario/reveal/history.
      setToolData(deserialized.data);
      showToast('Loaded state from shared URL', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared URL';
      showToast(message, 'error');
    }
  }, [setToolData, showToast]);

  const handleCopyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportText(state));
      showToast('Report copied to clipboard', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy report';
      showToast(message, 'error');
    }
  }, [showToast, state]);

  const handleGenerate = useCallback(() => {
    setToolData((prev) => ({ ...prev, password: generateStrongPassword(20), reveal: true }));
  }, [setToolData]);

  const handleClear = useCallback(() => {
    setToolData((prev) => ({ ...prev, password: '' }));
  }, [setToolData]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      // serializeState excludes the password by contract.
      const serialized = passwordStrengthCheckerTool.serialize(state);
      const encodedState = compressToEncodedURIComponent(serialized);
      const restored = passwordStrengthCheckerTool.deserialize(JSON.parse(serialized));
      if (!restored.success || (JSON.parse(serialized) as Record<string, unknown>).password) {
        throw new Error('Share state must not contain the password');
      }
      void encodedState;
      const url = new URL(window.location.href);
      url.searchParams.set('state', compressToEncodedURIComponent(serialized));
      url.searchParams.set('tool', toolConfig.id);
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title, url: shareUrl });
          showToast('Shared URL ready (without the password)', 'success');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share URL copied to clipboard (without the password)', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, state, title]);

  const toolbarContent = (
    <>
      <Toolbar
        state={state}
        onChange={(next) => setToolData(() => next)}
        onClear={handleClear}
        onCopy={() => void handleCopyReport()}
        onGenerate={handleGenerate}
      />
      <ImportExport
        formats={tool.supportedFormats}
        onExport={tool.handleExport}
        onImport={tool.importFromFile}
        isImporting={tool.isImporting}
        onShare={handleShare}
        isSharing={isSharing}
      />
    </>
  );

  const sidebarContent = <Sidebar state={state} onChange={(next) => setToolData(() => next)} />;

  const canvasContent = (
    <div ref={canvasRef}>
      <Canvas
        state={state}
        onChange={(next) => setToolData(() => next)}
        onSaveHistory={(text) => setToolData((prev) => withHistory(prev, text))}
      />
    </div>
  );

  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      <span className="status-slot status-slot-mode">{state.scenario}</span>
      <span className="status-slot status-slot-summary">
        {state.password ? 'Analyzing locally' : 'Enter a password to analyze'}
      </span>
      <span className="status-slot status-slot-history">{state.history.length} saved</span>
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  const hasLegacySections = Boolean(
    ToolShellCompat.Toolbar &&
    ToolShellCompat.Body &&
    ToolShellCompat.Sidebar &&
    ToolShellCompat.Canvas &&
    ToolShellCompat.StatusBar
  );

  return (
    <ToolShellCompat
      config={toolConfig}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    >
      {hasLegacySections
        ? (() => {
            const ToolbarSection = ToolShellCompat.Toolbar as ComponentType<{
              children?: ReactNode;
            }>;
            const BodySection = ToolShellCompat.Body as ComponentType<{ children?: ReactNode }>;
            const SidebarSection = ToolShellCompat.Sidebar as ComponentType<{
              children?: ReactNode;
            }>;
            const CanvasSection = ToolShellCompat.Canvas as ComponentType<{
              children?: ReactNode;
            }>;
            const StatusBarSection = ToolShellCompat.StatusBar as ComponentType<{
              children?: ReactNode;
            }>;
            return (
              <>
                <ToolbarSection>{toolbarContent}</ToolbarSection>
                <BodySection>
                  <SidebarSection>{sidebarContent}</SidebarSection>
                  <CanvasSection>{canvasContent}</CanvasSection>
                </BodySection>
                <StatusBarSection>{statusBarContent}</StatusBarSection>
                <StatusBarSection>{statusBarContent}</StatusBarSection>
              </>
            );
          })()
        : null}
    </ToolShellCompat>
  );
}
