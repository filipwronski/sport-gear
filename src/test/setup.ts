/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

// Mock environment variables
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_KEY: "test-key",
});

// Mock console.log and console.error for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
};
