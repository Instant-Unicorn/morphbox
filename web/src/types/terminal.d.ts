interface Window {
  morphboxTerminals?: Record<string, {
    sendInput: (input: string) => void;
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    clearSession: () => void;
    cliType?: 'claude' | 'gemini' | 'codex' | 'qwen' | 'bash' | null;
  }>;
  __lastViewportInfo?: {
    width: number;
    height: number;
    isSmall: boolean;
  };
  claudeDetectionData?: {
    timestamp: string;
    cliType: string | null;
    aiReady: boolean;
    last100Chars: string;
    fullAccumulatedOutput: string;
    claudeState: string;
  };
  lastClaudeIdleEvent?: {
    timestamp: string;
    cliType: string | null;
    reason?: string;
    output: string;
  };
}