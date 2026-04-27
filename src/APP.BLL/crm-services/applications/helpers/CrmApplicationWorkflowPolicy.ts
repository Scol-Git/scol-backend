import { Injectable } from '@nestjs/common';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';

@Injectable()
export class CrmApplicationWorkflowPolicy {
  validateStatusChangeOrThrow(input: {
    fromStatus: SysApplicationStatus;
    toStatus: SysApplicationStatus;
    currentStage: SysApplicationStage;
    remarks?: string;
  }): void {
    const { fromStatus, toStatus, remarks } = input;

    if (fromStatus.id === toStatus.id) {
      return;
    }

    if (toStatus.isTerminal === true && !this.hasNonEmptyText(remarks)) {
      throw new ValidationException(
        'Remarks are required when moving to a terminal application status',
        {
          remarks: ['Remarks are required for terminal status changes'],
        },
      );
    }

    if (
      this.isStatusRequiringRemarks(toStatus) &&
      !this.hasNonEmptyText(remarks)
    ) {
      throw new ValidationException(
        'Remarks are required for this application status',
        {
          remarks: [
            'Remarks are required when status is ON_HOLD, REJECTED, or CANCELLED',
          ],
        },
      );
    }
  }

  validateStageChangeOrThrow(input: {
    fromStage: SysApplicationStage;
    toStage: SysApplicationStage;
    remarks?: string;
  }): void {
    const { fromStage, toStage, remarks } = input;

    if (fromStage.id === toStage.id) {
      return;
    }

    const fromOrder = fromStage.stageOrder;
    const toOrder = toStage.stageOrder;

    if (
      fromOrder != null &&
      toOrder != null &&
      toOrder < fromOrder &&
      !this.hasNonEmptyText(remarks)
    ) {
      throw new ValidationException(
        'Remarks are required when moving to an earlier application stage',
        {
          remarks: [
            'Remarks are required when moving backwards in the stage order',
          ],
        },
      );
    }

    if (
      fromOrder != null &&
      toOrder != null &&
      toOrder > fromOrder + 1 &&
      !this.hasNonEmptyText(remarks)
    ) {
      throw new ValidationException(
        'Remarks are required when skipping one or more application stages',
        {
          remarks: ['Remarks are required when skipping forward stages'],
        },
      );
    }
  }

  private hasNonEmptyText(value?: string): boolean {
    return Boolean(value && value.trim().length > 0);
  }

  private normalizeCode(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private isStatusRequiringRemarks(status: SysApplicationStatus): boolean {
    const code = this.normalizeCode(status.statusCode);
    return code === 'ON_HOLD' || code === 'REJECTED' || code === 'CANCELLED';
  }
}
