import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

/** Keeps a long import from starving API requests of DB connections. */
@Injectable()
export class DbPressureGuard {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Waits (max ~10 s) while API requests are queuing for a DB connection. */
  async waitForCapacity(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      if (this.waitingCount() === 0) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  private waitingCount(): number {
    // TypeORM PostgresDriver exposes the pg Pool as `master`.
    const pool = (
      this.dataSource.driver as unknown as { master?: { waitingCount?: number } }
    ).master;
    return pool?.waitingCount ?? 0;
  }
}
