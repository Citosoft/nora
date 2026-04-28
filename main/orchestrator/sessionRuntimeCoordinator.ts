import type { LocalTerminalState, TerminalSession } from "@shared/appTypes";
import type { RuntimeSession } from "../types/internal.types";
import { capTerminalOutput } from "./terminalPerformance";

export class SessionRuntimeCoordinator {
  private readonly runtimeSessions = new Map<string, RuntimeSession>();
  private readonly terminalBuffers = new Map<string, string>();
  private readonly terminalActivityTimestamps = new Map<string, number[]>();
  private readonly contextWriteChains = new Map<string, Promise<void>>();
  private readonly liveTerminalSnapshots = new Map<string, TerminalSession>();
  private readonly terminalListeners = new Set<(sessionId: string, data: string) => void>();
  private localTerminalState: LocalTerminalState | null = null;

  getRuntimeSession(sessionId: string): RuntimeSession | undefined {
    return this.runtimeSessions.get(sessionId);
  }

  setRuntimeSession(sessionId: string, session: RuntimeSession): void {
    this.runtimeSessions.set(sessionId, session);
  }

  hasRuntimeSession(sessionId: string): boolean {
    return this.runtimeSessions.has(sessionId);
  }

  deleteRuntimeSession(sessionId: string): void {
    this.runtimeSessions.delete(sessionId);
  }

  killRuntimeSession(sessionId: string): void {
    const session = this.runtimeSessions.get(sessionId);
    if (!session) {
      return;
    }
    session.kill();
    this.runtimeSessions.delete(sessionId);
  }

  resizeRuntimeSession(sessionId: string, cols: number, rows: number): void {
    const session = this.runtimeSessions.get(sessionId);
    if (!session || cols <= 0 || rows <= 0) {
      return;
    }
    session.resize(cols, rows);
  }

  getRuntimeSessions(): Iterable<RuntimeSession> {
    return this.runtimeSessions.values();
  }

  getTerminalBuffer(sessionId: string): string {
    return this.terminalBuffers.get(sessionId) || "";
  }

  setTerminalBuffer(sessionId: string, value: string): void {
    this.terminalBuffers.set(sessionId, capTerminalOutput(value));
  }

  deleteTerminalBuffer(sessionId: string): void {
    this.terminalBuffers.delete(sessionId);
  }

  clearTerminalBuffers(): void {
    this.terminalBuffers.clear();
  }

  getTerminalActivity(sessionId: string): number[] | undefined {
    return this.terminalActivityTimestamps.get(sessionId);
  }

  setTerminalActivity(sessionId: string, timestamps: number[]): void {
    this.terminalActivityTimestamps.set(sessionId, timestamps);
  }

  deleteTerminalActivity(sessionId: string): void {
    this.terminalActivityTimestamps.delete(sessionId);
  }

  clearTerminalActivity(): void {
    this.terminalActivityTimestamps.clear();
  }

  getContextWriteChain(agentId: string): Promise<void> | undefined {
    return this.contextWriteChains.get(agentId);
  }

  setContextWriteChain(agentId: string, chain: Promise<void>): void {
    this.contextWriteChains.set(agentId, chain);
  }

  deleteContextWriteChain(agentId: string): void {
    this.contextWriteChains.delete(agentId);
  }

  clearContextWriteChains(): void {
    this.contextWriteChains.clear();
  }

  setLiveTerminalSnapshot(terminalId: string, terminal: TerminalSession): void {
    this.liveTerminalSnapshots.set(terminalId, terminal);
  }

  deleteLiveTerminalSnapshot(terminalId: string): void {
    this.liveTerminalSnapshots.delete(terminalId);
  }

  getLiveTerminalSnapshots(): TerminalSession[] {
    return [...this.liveTerminalSnapshots.values()];
  }

  clearLiveTerminalSnapshots(): void {
    this.liveTerminalSnapshots.clear();
  }

  getLocalTerminalState(): LocalTerminalState | null {
    return this.localTerminalState;
  }

  setLocalTerminalState(state: LocalTerminalState | null): void {
    this.localTerminalState = state;
  }

  addTerminalListener(listener: (sessionId: string, data: string) => void): void {
    this.terminalListeners.add(listener);
  }

  removeTerminalListener(listener: (sessionId: string, data: string) => void): void {
    this.terminalListeners.delete(listener);
  }

  emitTerminalData(sessionId: string, data: string): void {
    for (const listener of this.terminalListeners) {
      listener(sessionId, data);
    }
  }

  clearAllRuntimeState(): void {
    for (const session of this.runtimeSessions.values()) {
      session.kill();
    }
    this.runtimeSessions.clear();
    this.clearTerminalBuffers();
    this.clearLiveTerminalSnapshots();
    this.clearContextWriteChains();
    this.clearTerminalActivity();
  }
}
