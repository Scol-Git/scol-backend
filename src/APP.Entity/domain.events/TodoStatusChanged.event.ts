import { TodoStatusType } from '@shared/constants/TodoStatus.constants';

export interface TodoStatusChanged {
  orgId: string;
  todoId: string;
  fromStatus: TodoStatusType;
  toStatus: TodoStatusType;
  changedAt: string;
}
