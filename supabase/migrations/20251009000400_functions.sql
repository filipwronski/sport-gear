-- ============================================================================
-- Migration: Helper Functions
-- Description: Creates helper functions for RLS, GDPR, and utilities
-- Functions: is_bike_owner, export_user_data, delete_user_data
-- Dependencies: All previous tables
-- ============================================================================

-- ============================================================================
-- helper function: is_bike_owner
-- description: checks if current user owns the specified bike
-- ============================================================================

create or replace function is_bike_owner(bike_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from bikes 
    where id = bike_uuid and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

comment on function is_bike_owner is 'helper function to check bike ownership, used in rls policies for dry';

-- ============================================================================
-- gdpr function: export_user_data
-- description: exports all user data as json (right to data portability)
-- ============================================================================

create or replace function export_user_data(target_user_id uuid)
returns jsonb as $$
declare
  result jsonb;
begin
  -- verify user is requesting their own data
  if target_user_id != auth.uid() then
    raise exception 'unauthorized: can only export your own data';
  end if;
  
  -- build comprehensive json export
  select jsonb_build_object(
    'profile', (select to_jsonb(p.*) from profiles p where id = target_user_id),
    'locations', (select jsonb_agg(to_jsonb(ul.*)) from user_locations ul where user_id = target_user_id),
    'bikes', (select jsonb_agg(to_jsonb(b.*)) from bikes b where user_id = target_user_id),
    'service_records', (
      select jsonb_agg(to_jsonb(sr.*))
      from service_records sr
      join bikes b on sr.bike_id = b.id
      where b.user_id = target_user_id
    ),
    'service_reminders', (
      select jsonb_agg(to_jsonb(srm.*))
      from service_reminders srm
      join bikes b on srm.bike_id = b.id
      where b.user_id = target_user_id
    ),
    'outfit_feedbacks', (select jsonb_agg(to_jsonb(of.*)) from outfit_feedbacks of where user_id = target_user_id),
    'shared_outfits', (select jsonb_agg(to_jsonb(so.*)) from shared_outfits so where user_id = target_user_id),
    'export_timestamp', now()
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;

comment on function export_user_data is 'gdpr: export all user data as json (right to data portability)';

-- ============================================================================
-- gdpr function: delete_user_data
-- description: deletes all user data, anonymizes shared_outfits (right to erasure)
-- ============================================================================

create or replace function delete_user_data(target_user_id uuid)
returns void as $$
begin
  -- verify user is deleting their own data
  if target_user_id != auth.uid() then
    raise exception 'unauthorized: can only delete your own data';
  end if;
  
  -- anonymize shared_outfits (keep pseudonym for community integrity)
  update shared_outfits
  set user_id = null
  where user_id = target_user_id;
  
  -- delete profile (cascades to all owned data via fk)
  delete from profiles where id = target_user_id;
  
  -- delete auth user (final step)
  delete from auth.users where id = target_user_id;
  
  -- note: supabase auth will send confirmation email via configured template
end;
$$ language plpgsql security definer;

comment on function delete_user_data is 'gdpr: delete all user data, anonymize shared_outfits (right to erasure)';
