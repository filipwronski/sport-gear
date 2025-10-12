import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  try {
    // Simple response without any imports
    return new Response(
      JSON.stringify({
        message: "Simple feedback endpoint working",
        method: "GET",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
