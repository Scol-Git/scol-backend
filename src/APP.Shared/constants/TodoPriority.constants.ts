export class TodoPriority {
  static readonly LOW = 'LOW';
  static readonly MEDIUM = 'MEDIUM';
  static readonly HIGH = 'HIGH';

  static getAll(): Set<string> {
    return new Set([TodoPriority.LOW, TodoPriority.MEDIUM, TodoPriority.HIGH]);
  }

  static getOrder(priority: string): number {
    switch (priority) {
      case TodoPriority.LOW:
        return 1;
      case TodoPriority.MEDIUM:
        return 2;
      case TodoPriority.HIGH:
        return 3;
      default:
        return 0;
    }
  }
}

// Export Type
export type TodoPriorityType =
  | typeof TodoPriority.LOW
  | typeof TodoPriority.MEDIUM
  | typeof TodoPriority.HIGH;
