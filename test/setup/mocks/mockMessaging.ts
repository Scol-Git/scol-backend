/**
 * Mock Messaging Service Factory
 * 
 * Creates a mock message queue service (RabbitMQ, etc.).
 * 
 * @returns Mock messaging service object
 * 
 * @example
 * const mockMessaging = createMockMessaging();
 * mockMessaging.publish.mockResolvedValue(undefined);
 */
export const createMockMessaging = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  consume: jest.fn(),
  subscribe: jest.fn(),
});

