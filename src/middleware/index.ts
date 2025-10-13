import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client";
import {
  validateEnvironmentVariables,
  logEnvironmentValidation,
  getEnvironmentInfo,
} from "../lib/utils/env-validator";

// Environment validation on startup (only run once)
let envValidated = false;
if (!envValidated) {
  const validationResult = validateEnvironmentVariables();
  logEnvironmentValidation(validationResult);

  if (!validationResult.isValid) {
    console.error(
      "\n🚨 Application startup failed due to environment configuration errors",
    );
    console.error(
      "Please fix the environment variables and restart the application.\n",
    );

    // In development, show current config for debugging
    if (import.meta.env.DEV) {
      console.log("📊 Current environment configuration:");
      const envInfo = getEnvironmentInfo();
      Object.entries(envInfo).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    // Don't crash in development, but log errors clearly
    if (!import.meta.env.DEV) {
      process.exit(1);
    }
  }

  envValidated = true;
}

/**
 * Astro middleware for authentication and Supabase client injection
 *
 * For API routes (/api/*):
 * - In development: accepts mock tokens for testing
 * - In production: validates JWT token from Authorization header
 * - Extracts userId and stores in locals
 * - Returns 401 for missing/invalid tokens
 *
 * For protected page routes (dashboard, bikes, community, profile, recommendations):
 * - Validates authentication token from cookies
 * - Extracts userId and stores in locals
 * - Redirects to /auth/login for missing/invalid tokens
 *
 * For other routes:
 * - Only injects Supabase client
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, url } = context;

  // Always inject Supabase client
  locals.supabase = supabaseClient;

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/bikes',
    '/community',
    '/profile',
    '/recommendations'
  ];

  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route));
  const isApiRoute = url.pathname.startsWith('/api/');

  // Skip authentication for non-protected routes
  if (!isApiRoute && !isProtectedRoute) {
    return next();
  }

  // Skip authentication for admin API endpoints
  if (isApiRoute && url.pathname.includes("/api/admin-")) {
    return next();
  }

  // Extract token from Authorization header (for API routes) or cookie (for page routes)
  const authHeader = request.headers.get("Authorization");
  let token = authHeader?.replace("Bearer ", "");

  // If no Authorization header, check for session cookie (for both API and page routes)
  if (!token) {
    const cookies = request.headers.get("cookie");
    if (cookies) {
      const cookieMatch = cookies.match(/sb-access-token=([^;]+)/);
      if (cookieMatch) {
        token = cookieMatch[1];
      }
    }
  }

  if (!token) {
    if (isApiRoute) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication token required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      // For protected page routes, redirect to login
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }
  }

  // Development mode: accept mock tokens for testing
  const isDevelopment =
    import.meta.env.MODE === "development" || import.meta.env.DEV;

  if (isDevelopment) {
    // Accept specific mock tokens for testing
    const mockTokens = [
      "test-token",
      "mock-jwt-token",
      "dev-token",
      "curl-test-token",
    ];

    if (mockTokens.includes(token)) {
      // Use mock user ID for testing (valid UUID format)
      locals.userId = "550e8400-e29b-41d4-a716-446655440000";
      console.log(`[Middleware] Mock auth successful for token: ${token}`);
      return next();
    }
  }

  try {
    // First try to verify the access token
    let userResult = await supabaseClient.auth.getUser(token);

    // If access token is expired, try to refresh using refresh token
    if (userResult.error && userResult.error.message.includes("expired")) {
      const cookies = request.headers.get("cookie");
      const refreshTokenMatch = cookies?.match(/sb-refresh-token=([^;]+)/);
      const refreshToken = refreshTokenMatch?.[1];

      if (refreshToken) {
        console.log("[Middleware] Access token expired, attempting refresh");
        const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshData.session) {
          // For page routes, we need to redirect to refresh cookies
          if (!isApiRoute) {
            const isLocalhost = url.hostname === 'localhost';
            const cookieOptions = `max-age=${60 * 60 * 24 * 30}; path=/; samesite=${isLocalhost ? 'lax' : 'strict'}; HttpOnly${isLocalhost ? '' : '; secure'}`;

            return new Response(null, {
              status: 302,
              headers: {
                Location: url.pathname + url.search,
                "Set-Cookie": [
                  `sb-access-token=${refreshData.session.access_token}; ${cookieOptions}`,
                  `sb-refresh-token=${refreshData.session.refresh_token}; ${cookieOptions}`
                ].join(", ")
              },
            });
          }

          // For API routes, update cookies in response
          const response = await next();
          const isLocalhost = url.hostname === 'localhost';
          const maxAge = 60 * 60 * 24 * 30;
          const cookieOptions = `max-age=${maxAge}; path=/; samesite=${isLocalhost ? 'lax' : 'strict'}; HttpOnly${isLocalhost ? '' : '; secure'}`;

          // Set new cookies in response
          response.headers.set(
            "Set-Cookie",
            `sb-access-token=${refreshData.session.access_token}; ${cookieOptions}`
          );
          response.headers.append(
            "Set-Cookie",
            `sb-refresh-token=${refreshData.session.refresh_token}; ${cookieOptions}`
          );

          locals.userId = refreshData.user?.id;
          return response;
        }
      }
    }

    if (userResult.error || !userResult.data.user) {
      if (isApiRoute) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid or expired token",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        // For protected page routes, redirect to login
        return new Response(null, {
          status: 302,
          headers: { Location: "/auth/login" },
        });
      }
    }

    // Store userId in locals for route handlers
    locals.userId = userResult.data.user.id;

    return next();
  } catch (error) {
    console.error("[Middleware] Auth error:", error);
    if (isApiRoute) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication failed",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      // For protected page routes, redirect to login
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }
  }
});
