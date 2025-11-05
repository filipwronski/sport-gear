import type { APIRoute } from "astro";

/**
 * POST /api/auth/logout
 * Logs out the user by clearing authentication cookies
 */
export const POST: APIRoute = async (_context) => {
  try {
    // Create response
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Clear authentication cookies
    const cookieOptions = "max-age=0; path=/; HttpOnly; SameSite=Lax";

    // Clear Supabase auth cookies
    response.headers.set(
      "Set-Cookie",
      [
        `sb-access-token=; ${cookieOptions}`,
        `sb-refresh-token=; ${cookieOptions}`,
      ].join(", "),
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Failed to logout",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
