import type { DataSource, EntityManager } from 'typeorm';

/**
 * Short write transaction with safety timeouts.
 * SET LOCAL is transaction-scoped, so it is safe behind PgBouncer (Neon pooler).
 */
export function runInTx<T>(
  dataSource: DataSource,
  fn: (em: EntityManager) => Promise<T>,
): Promise<T> {
  return dataSource.manager.transaction(async (em) => {
    await em.query(`SET LOCAL statement_timeout = '15s'`);
    await em.query(`SET LOCAL lock_timeout = '3s'`);
    return fn(em);
  });
}
