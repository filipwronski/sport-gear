/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import "@testing-library/jest-dom";

// Mock environment variables
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_KEY: "test-key",
});

// Mock console.info and console.error for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
};
