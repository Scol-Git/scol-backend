/**
 * Explicit PostgreSQL advisory lock keys for bulk import (collision-free vs hashtext).
 * Use with `pg_try_advisory_lock($1::bigint)` / `pg_advisory_unlock($1::bigint)`.
 */
export const ADVISORY_LOCK_BULK_IMPORT_COURSE = 100001n;
export const ADVISORY_LOCK_BULK_IMPORT_UNIVERSITY = 100002n;
