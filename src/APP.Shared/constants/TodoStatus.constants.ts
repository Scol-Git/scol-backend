export class TodoStatus {
  // Constant values
  static readonly NEW = 'NEW';
  static readonly IN_PROGRESS = 'IN_PROGRESS';
  static readonly DONE = 'DONE';
  static readonly BLOCKED = 'BLOCKED';

  // Helper methods — equivalent to static utility methods in .NET
  static getAll(): Set<string> {
    return new Set([
      TodoStatus.NEW,
      TodoStatus.IN_PROGRESS,
      TodoStatus.DONE,
      TodoStatus.BLOCKED,
    ]);
  }

  static isActive(status: string): boolean {
    return status === TodoStatus.NEW || status === TodoStatus.IN_PROGRESS;
  }

  static isFinal(status: string): boolean {
    return status === TodoStatus.DONE || status === TodoStatus.BLOCKED;
  }
}

// Export Type
export type TodoStatusType =
  | typeof TodoStatus.NEW
  | typeof TodoStatus.IN_PROGRESS
  | typeof TodoStatus.DONE
  | typeof TodoStatus.BLOCKED;
