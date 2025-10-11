import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  return new Response(JSON.stringify({ 
    message: 'Test endpoint works',
    userId: locals.userId || 'no user'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
