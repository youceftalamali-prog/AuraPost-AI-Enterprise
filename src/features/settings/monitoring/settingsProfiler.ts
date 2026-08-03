export interface ProfilerMark {
  name: string;
  duration: number;
  timestamp: string;
}

class SettingsProfiler {
  private marks: Map<string, number> = new Map();
  private history: ProfilerMark[] = [];

  start(name: string) {
    this.marks.set(name, performance.now());
  }

  end(name: string) {
    const start = this.marks.get(name);
    if (start !== undefined) {
      const duration = performance.now() - start;
      this.history.push({
        name,
        duration,
        timestamp: new Date().toISOString(),
      });
      this.marks.delete(name);
      if (this.history.length > 500) this.history.shift();
      return duration;
    }
    return 0;
  }

  getHistory(): ProfilerMark[] {
    return [...this.history];
  }
}

export const settingsProfiler = new SettingsProfiler();