export type Plan = 'free' | 'pro';

export type AppMode = {
  real: boolean; // real data mode
  map3d: boolean; // 3D globe mode
};

export type Profile = {
  id: string;
  name: string;
  plan: Plan;
  achievements: string[];
};

export type LogEntry = { id: string; text: string; glitch?: boolean };
export type LogSession = { id: string; userId?: string; createdAt: number; lines: string[]; meta?: Record<string, any> };

export type CommandContext = {
  mode: AppMode;
  profile: Profile | null;
  setMode: (m: Partial<AppMode>) => void;
  saveSession: (session: LogSession) => Promise<void> | void;
  listSessions: () => Promise<LogSession[]> | LogSession[];
  getSession: (id: string) => Promise<LogSession | null> | LogSession | null;
};

export type CommandResult = {
  lines?: string[];
  error?: string;
  // Optional side effects
  traceToCity?: string; // triggers trace-route
};

export type Command = {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  gatedByPlan?: Plan; // if set, requires this or higher
  execute: (args: string[], ctx: CommandContext) => Promise<CommandResult> | CommandResult;
};

// Typing tool types
export type TypingMode = { kind: 'time'; durationSec: number } | { kind: 'words'; wordCount: number };
export type TypingSession = {
  id: string;
  createdAt: number;
  mode: TypingMode;
  prompt: string;
  wpm: number;
  rawWpm: number;
  accuracy: number; // 0..100
  correct: number;
  incorrect: number;
  timeline?: { t: number; cps: number }[]; // per-second characters typed
  mistakes?: Record<string, number>; // char -> count of mismatches
};
