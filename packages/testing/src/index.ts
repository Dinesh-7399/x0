// @gymato/testing - Testing utilities

/**
 * Create a mock function that tracks calls
 */
export function createMock<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): T & { calls: Parameters<T>[]; reset: () => void } {
  const calls: Parameters<T>[] = [];

  const mock = ((...args: Parameters<T>) => {
    calls.push(args);
    return implementation?.(...args);
  }) as T & { calls: Parameters<T>[]; reset: () => void };

  mock.calls = calls;
  mock.reset = () => {
    calls.length = 0;
  };

  return mock;
}

/**
 * Test fixture factory
 */
export function createFixture<T>(defaults: T) {
  return (overrides?: Partial<T>): T => ({
    ...defaults,
    ...overrides,
  });
}

/**
 * Common test user fixture
 */
export const testUserFixture = createFixture({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user' as const,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

/**
 * Wait for async operations to complete
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Assert that a promise rejects with expected error
 */
export async function expectReject(
  promise: Promise<unknown>,
  errorMatch?: string | RegExp
): Promise<Error> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
    if (errorMatch && error instanceof Error) {
      const matches =
        typeof errorMatch === 'string'
          ? error.message.includes(errorMatch)
          : errorMatch.test(error.message);
      if (!matches) {
        throw new Error(
          `Expected error message to match ${errorMatch} but got: ${error.message}`
        );
      }
    }
    return error as Error;
  }
}

/**
 * Generate test data helpers
 */
export const testData = {
  email: (prefix = 'test') => `${prefix}-${Date.now()}@example.com`,
  id: () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  phone: () => `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
};
