/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import "@testing-library/jest-dom";

// Mock environment variables
Object.assign(process.env, {
  PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
});

// Mock console.info and console.error for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
};
