/**
 * Mock Logger Factory
 * 
 * Creates a mock logger with all logging methods.
 * 
 * @returns Mock logger object
 * 
 * @example
 * const mockLogger = createMockLogger();
 * expect(mockLogger.LogInfo).toHaveBeenCalled();
 */
export const createMockLogger = () => ({
  LogInfo: jest.fn(),
  LogError: jest.fn(),
  LogWarning: jest.fn(),
  LogDebug: jest.fn(),
});

