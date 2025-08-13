interface Window {
  morphboxTerminals?: Record<string, {
    sendInput: (input: string) => void;
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    clearSession: () => void;
  }>;
  __lastViewportInfo?: {
    width: number;
    height: number;
    isSmall: boolean;
  };
}