-- ============================================================================
-- Migration: Row Level Security Policies
-- Description: Creates RLS policies for all tables (zero-trust security model)
-- Tables: All tables
-- Dependencies: All previous migrations
-- ============================================================================

-- ============================================================================
-- rls policies: profiles
-- ============================================================================

-- select: users can only view their own profile
create policy profiles_select_own on profiles
  for select
  to authenticated
  using (id = auth.uid());

-- update: users can only update their own profile
create policy profiles_update_own on profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert: allow trigger to create profiles for authenticated users
create policy profiles_insert_own on profiles
  for insert
  to authenticated
  with check (id = auth.uid());
-- note: delete blocked (use delete_user_data() function for gdpr)

-- ============================================================================
-- rls policies: user_locations
-- ============================================================================

-- select: users can only view their own locations
create policy user_locations_select_own on user_locations
  for select
  to authenticated
  using (user_id = auth.uid());

-- insert: users can only insert their own locations
create policy user_locations_insert_own on user_locations
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- update: users can only update their own locations
create policy user_locations_update_own on user_locations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- delete: users can only delete their own locations
create policy user_locations_delete_own on user_locations
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies: bikes
-- ============================================================================

-- select: users can only view their own bikes
create policy bikes_select_own on bikes
  for select
  to authenticated
  using (user_id = auth.uid());

-- insert: users can only insert their own bikes
create policy bikes_insert_own on bikes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- update: users can only update their own bikes
create policy bikes_update_own on bikes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- delete: users can only delete their own bikes
create policy bikes_delete_own on bikes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies: service_records
-- ============================================================================

-- select: users can only view records for their bikes
create policy service_records_select_own on service_records
  for select
  to authenticated
  using (is_bike_owner(bike_id));

-- insert: users can only insert records for their bikes
create policy service_records_insert_own on service_records
  for insert
  to authenticated
  with check (is_bike_owner(bike_id));

-- update: users can only update records for their bikes
create policy service_records_update_own on service_records
  for update
  to authenticated
  using (is_bike_owner(bike_id))
  with check (is_bike_owner(bike_id));

-- delete: users can only delete records for their bikes
create policy service_records_delete_own on service_records
  for delete
  to authenticated
  using (is_bike_owner(bike_id));

-- ============================================================================
-- rls policies: service_reminders
-- ============================================================================

-- select: users can only view reminders for their bikes
create policy service_reminders_select_own on service_reminders
  for select
  to authenticated
  using (is_bike_owner(bike_id));

-- insert: users can only insert reminders for their bikes
create policy service_reminders_insert_own on service_reminders
  for insert
  to authenticated
  with check (is_bike_owner(bike_id));

-- update: users can only update reminders for their bikes
create policy service_reminders_update_own on service_reminders
  for update
  to authenticated
  using (is_bike_owner(bike_id))
  with check (is_bike_owner(bike_id));

-- delete: users can only delete reminders for their bikes
create policy service_reminders_delete_own on service_reminders
  for delete
  to authenticated
  using (is_bike_owner(bike_id));

-- ============================================================================
-- rls policies: outfit_feedbacks
-- ============================================================================

-- select: users can only view their own feedbacks
create policy outfit_feedbacks_select_own on outfit_feedbacks
  for select
  to authenticated
  using (user_id = auth.uid());

-- insert: users can only insert their own feedbacks
create policy outfit_feedbacks_insert_own on outfit_feedbacks
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- update: users can only update their own feedbacks
create policy outfit_feedbacks_update_own on outfit_feedbacks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- delete: users can only delete their own feedbacks
create policy outfit_feedbacks_delete_own on outfit_feedbacks
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies: shared_outfits
-- ============================================================================

-- select: all authenticated users can view community outfits
create policy shared_outfits_select_all on shared_outfits
  for select
  to authenticated
  using (true);

-- insert: users can only insert their own shared outfits
create policy shared_outfits_insert_own on shared_outfits
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- note: update not allowed (immutable data)

-- delete: users can only delete their own shared outfits (gdpr)
create policy shared_outfits_delete_own on shared_outfits
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies: weather_cache
-- ============================================================================

-- select: all authenticated users can view weather cache
create policy weather_cache_select_all on weather_cache
  for select
  to authenticated
  using (true);

-- insert/update/delete: only service_role (edge functions)
create policy weather_cache_service_role on weather_cache
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- rls policies: default_service_intervals
-- ============================================================================

-- select: all authenticated users can view defaults
create policy default_service_intervals_select_all on default_service_intervals
  for select
  to authenticated
  using (true);

-- insert/update/delete: only service_role (admin modifications)
create policy default_service_intervals_service_role on default_service_intervals
  for all
  to service_role
  using (true)
  with check (true);
