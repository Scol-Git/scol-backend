export interface TodoCreated {
  orgId: string;
  projectId: string;
  todoId: string;
  title: string;
  dueAt?: string;
}
