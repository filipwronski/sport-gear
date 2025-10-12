import type { APIRoute } from "astro";

/**
 * GET /api/bikes/{bikeId}/services/stats-test - Simple stats test
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  return new Response(
    JSON.stringify({
      message: "Stats endpoint works",
      bikeId: params.bikeId,
      userId: locals.userId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
