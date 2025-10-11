import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client";

/**
 * Astro middleware for authentication and Supabase client injection
 *
 * For API routes (/api/*):
 * - In development: accepts mock tokens for testing
 * - In production: validates JWT token from Authorization header
 * - Extracts userId and stores in locals
 * - Returns 401 for missing/invalid tokens
 *
 * For other routes:
 * - Only injects Supabase client
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals } = context;

  // Always inject Supabase client
  locals.supabase = supabaseClient;

  // Only enforce authentication for API routes (except admin endpoints)
  if (!request.url.includes("/api/")) {
    return next();
  }

  // Skip authentication for admin endpoints
  if (request.url.includes("/api/admin-")) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
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
  }

  // Development mode: accept mock tokens for testing
  const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
  
  if (isDevelopment) {
    // Accept specific mock tokens for testing
    const mockTokens = [
      'test-token',
      'mock-jwt-token',
      'dev-token',
      'curl-test-token'
    ];
    
    if (mockTokens.includes(token)) {
      // Use mock user ID for testing (valid UUID format)
      locals.userId = '550e8400-e29b-41d4-a716-446655440000';
      console.log(`[Middleware] Mock auth successful for token: ${token}`);
      return next();
    }
  }

  try {
    // Verify token with Supabase (production or real tokens in dev)
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
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
    }

    // Store userId in locals for route handlers
    locals.userId = user.id;

    return next();
  } catch (error) {
    console.error("[Middleware] Auth error:", error);
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
  }
});
