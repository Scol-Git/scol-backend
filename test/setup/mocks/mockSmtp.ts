/**
 * Mock SMTP Email Sender Factory
 * 
 * Creates a mock email sender service.
 * 
 * @returns Mock SMTP service object
 * 
 * @example
 * const mockSmtp = createMockSmtp();
 * mockSmtp.sendMail.mockResolvedValue(undefined);
 */
export const createMockSmtp = () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
});

