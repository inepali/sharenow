import { beforeAll, afterAll, expect } from "vitest";

// Mock environment variables for testing
beforeAll(() => {
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-key";
  process.env.R2_ACCOUNT_ID = "test-account";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET_NAME = "test-bucket";
  process.env.ALLOWED_ORIGINS = "http://localhost:3000";
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("VITE_") || key.startsWith("R2_") || key === "SUPABASE_URL" || key === "SUPABASE_ANON_KEY" || key === "ALLOWED_ORIGINS") {
      delete process.env[key];
    }
  });
});
