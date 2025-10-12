import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Sprawdź czy są jacyś prawdziwi użytkownicy w systemie
    const { data: profiles, error } = await locals.supabase
      .from("profiles")
      .select("id, display_name")
      .limit(1);

    if (profiles && profiles.length > 0) {
      const realUserId = profiles[0].id;

      // Przetestuj API z prawdziwym userem (tymczasowo)
      const testUserId = realUserId;

      return new Response(
        JSON.stringify({
          success: true,
          realUserFound: true,
          realUserId: realUserId,
          suggestion: `Użyj tego ID w middleware zamiast mock ID: ${realUserId}`,
          profiles: profiles,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        realUserFound: false,
        message:
          "Brak prawdziwych użytkowników. Musisz utworzyć mock profil przez Supabase Dashboard.",
        instruction:
          "Wykonaj SQL w Supabase Dashboard: INSERT INTO profiles...",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Exception occurred",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
};
