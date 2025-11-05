/**
 * Environment Variables Verification Utility
 *
 * Validates that all required environment variables are present
 * and properly configured at application startup.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates environment variables configuration
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const requiredVars = ["PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_ANON_KEY"];

  // Optional but recommended variables
  const optionalVars = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENWEATHER_API_KEY",
    "OPENROUTER_API_KEY",
  ];

  // Check required variables
  for (const varName of requiredVars) {
    const value = import.meta.env[varName];
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`Environment variable ${varName} is empty or invalid`);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = import.meta.env[varName];
    if (!value) {
      warnings.push(
        `Missing optional environment variable: ${varName} - some features may not work`,
      );
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !isValidSupabaseUrl(supabaseUrl)) {
    errors.push(
      "PUBLIC_SUPABASE_URL format is invalid. Should be https://xxx.supabase.co",
    );
  }

  // Validate Supabase keys format (basic check)
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseKey && !isValidSupabaseKey(supabaseKey)) {
    errors.push("PUBLIC_SUPABASE_ANON_KEY format appears to be invalid");
  }

  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseServiceKey && !isValidSupabaseKey(supabaseServiceKey)) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY format appears to be invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates Supabase URL format
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === "https:" &&
      (parsedUrl.hostname.endsWith(".supabase.co") ||
        parsedUrl.hostname.includes("localhost"))
    );
  } catch {
    return false;
  }
}

/**
 * Validates Supabase key format (basic JWT-like structure check)
 */
function isValidSupabaseKey(key: string): boolean {
  // Basic check for JWT-like structure (should have 3 parts separated by dots)
  const parts = key.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Logs environment validation results
 */
export function logEnvironmentValidation(result: ValidationResult): void {
  if (result.isValid) {
    console.info("✅ Environment variables validation passed");

    if (result.warnings.length > 0) {
      console.warn("⚠️  Environment warnings:");
      result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    }
  } else {
    console.error("❌ Environment variables validation failed");
    console.error("🔴 Errors:");
    result.errors.forEach((error) => console.error(`   - ${error}`));

    if (result.warnings.length > 0) {
      console.warn("⚠️  Warnings:");
      result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    }

    console.error("\n📋 Required environment variables:");
    console.error("   - PUBLIC_SUPABASE_URL: Your Supabase project URL");
    console.error(
      "   - PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key",
    );
    console.error("\n📋 Optional environment variables:");
    console.error(
      "   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations",
    );
    console.error(
      "   - OPENWEATHER_API_KEY: OpenWeather API key for weather data",
    );
    console.error(
      "   - OPENROUTER_API_KEY: OpenRouter API key for AI features",
    );
  }
}

/**
 * Gets current environment configuration (safe for logging)
 */
export function getEnvironmentInfo(): Record<string, string> {
  const maskValue = (value: string | undefined): string => {
    if (!value) return "NOT SET";
    if (value.length <= 8) return "***";
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  };

  return {
    NODE_ENV: import.meta.env.MODE || "unknown",
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || "NOT SET",
    PUBLIC_SUPABASE_ANON_KEY: maskValue(
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    ),
    SUPABASE_SERVICE_ROLE_KEY: maskValue(
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    OPENWEATHER_API_KEY: maskValue(import.meta.env.OPENWEATHER_API_KEY),
    OPENROUTER_API_KEY: maskValue(import.meta.env.OPENROUTER_API_KEY),
  };
}
