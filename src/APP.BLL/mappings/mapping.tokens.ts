/**
 * Legacy token for Mapper (deprecated - use IMapper from injection.tokens.ts)
 * @deprecated Use IMapper from @shared/tokens/injection.tokens instead
 */
export const MAPPER = Symbol('APP_MAPPER');

/**
 * Re-export IMapper token for consistency
 * This allows both old (MAPPER) and new (IMapper) code to work during migration
 */
export { IMapper } from '@shared/tokens/injection.tokens';
