import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/bikes/{bikeId}/reminders-simple
 * Fetch reminders for a specific bike (simplified version)
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const bikeId = params.bikeId;
    if (!bikeId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing bike ID'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create service client directly (bypasses RLS in development)
    const supabaseServiceClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify bike ownership first
    const { data: bike, error: bikeError } = await supabaseServiceClient
      .from('bikes')
      .select('id, current_mileage')
      .eq('id', bikeId)
      .eq('user_id', locals.userId)
      .single();

    if (bikeError || !bike) {
      return new Response(
        JSON.stringify({
          error: 'Bike Not Found',
          message: `Bike with ID ${bikeId} does not exist or you don't have access`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get reminders for this bike
    const { data, error } = await supabaseServiceClient
      .from('service_reminders')
      .select('*')
      .eq('bike_id', bikeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminders:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch reminders'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Transform data and compute fields
    const reminders = (data || []).map(row => {
      const currentMileage = bike.current_mileage || 0;
      const targetMileage = row.triggered_at_mileage + row.interval_km;
      const kmRemaining = targetMileage - currentMileage;

      // Compute status
      let status;
      if (row.completed_at) {
        status = 'completed';
      } else if (kmRemaining < 0) {
        status = 'overdue';
      } else if (kmRemaining <= 200) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      return {
        id: row.id,
        bike_id: row.bike_id,
        service_type: row.service_type,
        triggered_at_mileage: row.triggered_at_mileage,
        interval_km: row.interval_km,
        target_mileage: targetMileage,
        current_mileage: currentMileage,
        km_remaining: kmRemaining,
        status,
        completed_at: row.completed_at,
        completed_service_id: row.completed_service_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return new Response(JSON.stringify(reminders), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('GET /api/bikes/[bikeId]/reminders-simple error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * POST /api/bikes/{bikeId}/reminders-simple
 * Create a new service reminder (simplified version)
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const bikeId = params.bikeId;
    if (!bikeId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing bike ID'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Basic validation
    if (!body.service_type || !body.interval_km) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required fields: service_type, interval_km'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create service client directly (bypasses RLS in development)
    const supabaseServiceClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify bike ownership and get current mileage
    const { data: bike, error: bikeError } = await supabaseServiceClient
      .from('bikes')
      .select('id, current_mileage')
      .eq('id', bikeId)
      .eq('user_id', locals.userId)
      .single();

    if (bikeError || !bike) {
      return new Response(
        JSON.stringify({
          error: 'Bike Not Found',
          message: 'Bike not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const currentMileage = bike.current_mileage || 0;

    // Check for existing active reminder of the same type
    const { data: existingReminder } = await supabaseServiceClient
      .from('service_reminders')
      .select('id')
      .eq('bike_id', bikeId)
      .eq('service_type', body.service_type)
      .is('completed_at', null)
      .single();

    if (existingReminder) {
      return new Response(
        JSON.stringify({
          error: 'Conflict',
          message: `Active reminder for service type '${body.service_type}' already exists for this bike`
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert new reminder
    const { data, error } = await supabaseServiceClient
      .from('service_reminders')
      .insert({
        bike_id: bikeId,
        service_type: body.service_type,
        interval_km: body.interval_km,
        triggered_at_mileage: currentMileage
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to create reminder'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Transform response
    const targetMileage = data.triggered_at_mileage + data.interval_km;
    const kmRemaining = targetMileage - currentMileage;

    let status;
    if (data.completed_at) {
      status = 'completed';
    } else if (kmRemaining < 0) {
      status = 'overdue';
    } else if (kmRemaining <= 200) {
      status = 'active';
    } else {
      status = 'upcoming';
    }

    const reminder = {
      id: data.id,
      bike_id: data.bike_id,
      service_type: data.service_type,
      triggered_at_mileage: data.triggered_at_mileage,
      interval_km: data.interval_km,
      target_mileage: targetMileage,
      current_mileage: currentMileage,
      km_remaining: kmRemaining,
      status,
      completed_at: data.completed_at,
      completed_service_id: data.completed_service_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return new Response(JSON.stringify(reminder), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('POST /api/bikes/[bikeId]/reminders-simple error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
