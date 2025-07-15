import type { ComponentType, SvelteComponent } from 'svelte';

export interface PanelConfig {
  id: string;
  title: string;
  icon?: string;
  component: ComponentType<SvelteComponent>;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  movable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
}

export interface PanelState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export interface PanelProps {
  config: PanelConfig;
  state: PanelState;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  onFocus?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
}

export interface PanelContext {
  registerPanel: (config: PanelConfig) => void;
  unregisterPanel: (id: string) => void;
  openPanel: (id: string, state?: Partial<PanelState>) => void;
  closePanel: (id: string) => void;
  focusPanel: (id: string) => void;
  updatePanelState: (id: string, state: Partial<PanelState>) => void;
  getPanelState: (id: string) => PanelState | undefined;
  getAllPanels: () => PanelState[];
}