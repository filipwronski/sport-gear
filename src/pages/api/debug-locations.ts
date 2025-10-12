import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const userId = locals.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "No userId in locals",
        }),
        { status: 400 },
      );
    }

    // Test basic Supabase connection
    const { data, error, count } = await locals.supabase
      .from("user_locations")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        count: count,
        data: data,
        error: error,
        supabaseAvailable: !!locals.supabase,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Exception occurred",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500 },
    );
  }
};
