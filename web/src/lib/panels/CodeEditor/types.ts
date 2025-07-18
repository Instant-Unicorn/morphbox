export interface EditorTab {
  id: string;
  fileName: string;
  filePath?: string;
  content: string;
  language: string;
  isDirty: boolean;
  viewState: any | null;
}

export type EditorTheme = 'vs' | 'vs-dark' | 'hc-black' | 'custom-dark';

export interface EditorOptions {
  theme?: EditorTheme;
  fontSize?: number;
  minimap?: boolean;
  lineNumbers?: boolean;
  wordWrap?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface SaveEvent {
  fileName: string;
  content: string;
}

export interface ChangeEvent {
  fileName: string;
  content: string;
}

export interface TabClosedEvent {
  tabId: string;
  fileName: string;
}