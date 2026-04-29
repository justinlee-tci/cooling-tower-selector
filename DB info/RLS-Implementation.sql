-- ============================================================================
-- COMPREHENSIVE RLS IMPLEMENTATION FOR COOLING TOWER SELECTOR
-- ============================================================================
-- This script properly implements Row-Level Security for all tables
-- with consideration for superadmin access and regular user isolation

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooling_tower_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooling_tower_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. DROP EXISTING POLICIES (if any) TO AVOID CONFLICTS
-- ============================================================================

-- Drop existing policies on users table
DROP POLICY IF EXISTS "Users can see own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Drop existing policies on cooling_tower_models
DROP POLICY IF EXISTS "Allow public read models" ON public.cooling_tower_models;

-- Drop existing policies on cooling_tower_performance
DROP POLICY IF EXISTS "Allow public read performance" ON public.cooling_tower_performance;

-- Drop existing policies on selections
DROP POLICY IF EXISTS "Users can see own selections" ON public.selections;
DROP POLICY IF EXISTS "Users can insert own selections" ON public.selections;
DROP POLICY IF EXISTS "Users can update own selections" ON public.selections;
DROP POLICY IF EXISTS "Users can delete own selections" ON public.selections;

-- ============================================================================
-- 3. USERS TABLE POLICIES
-- ============================================================================
-- Purpose: Users can see/edit their own profile, superadmins can see all

-- SELECT: Users see their own profile, superadmins see all
CREATE POLICY "users_select_own_or_admin"
ON public.users
FOR SELECT
TO authenticated
USING (
  email = auth.jwt()->>'email' 
  OR 
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
);

-- UPDATE: Users can update their own profile, superadmins can update all
CREATE POLICY "users_update_own_or_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  email = auth.jwt()->>'email' 
  OR 
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
)
WITH CHECK (
  email = auth.jwt()->>'email' 
  OR 
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
);

-- INSERT: Only service_role can insert (for registration via API)
CREATE POLICY "users_insert_service_role"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (false);  -- Block direct inserts from authenticated users

-- DELETE: Only service_role can delete
CREATE POLICY "users_delete_service_role"
ON public.users
FOR DELETE
TO authenticated
USING (false);  -- Block direct deletes from authenticated users

-- ============================================================================
-- 4. COOLING TOWER MODELS TABLE POLICIES
-- ============================================================================
-- Purpose: Public read for all authenticated users (reference data)

-- SELECT: All authenticated users can read (this is reference data)
CREATE POLICY "models_select_authenticated"
ON public.cooling_tower_models
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Only service_role (blocked for authenticated)
CREATE POLICY "models_write_service_role"
ON public.cooling_tower_models
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "models_update_service_role"
ON public.cooling_tower_models
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "models_delete_service_role"
ON public.cooling_tower_models
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- 5. COOLING TOWER PERFORMANCE TABLE POLICIES
-- ============================================================================
-- Purpose: Public read for all authenticated users (reference data)

-- SELECT: All authenticated users can read (this is reference data)
CREATE POLICY "performance_select_authenticated"
ON public.cooling_tower_performance
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Only service_role (blocked for authenticated)
CREATE POLICY "performance_write_service_role"
ON public.cooling_tower_performance
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "performance_update_service_role"
ON public.cooling_tower_performance
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "performance_delete_service_role"
ON public.cooling_tower_performance
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- 6. SELECTIONS TABLE POLICIES
-- ============================================================================
-- Purpose: Users see/edit their own selections, superadmins see all

-- SELECT: Users see their own selections, superadmins see all
CREATE POLICY "selections_select_own_or_admin"
ON public.selections
FOR SELECT
TO authenticated
USING (
  user_email = auth.jwt()->>'email'
  OR
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
);

-- INSERT: Users can insert their own selections
CREATE POLICY "selections_insert_own"
ON public.selections
FOR INSERT
TO authenticated
WITH CHECK (
  user_email = auth.jwt()->>'email'
);

-- UPDATE: Users can update their own selections, superadmins can update all
CREATE POLICY "selections_update_own_or_admin"
ON public.selections
FOR UPDATE
TO authenticated
USING (
  user_email = auth.jwt()->>'email'
  OR
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
)
WITH CHECK (
  user_email = auth.jwt()->>'email'
  OR
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
);

-- DELETE: Users can delete their own selections, superadmins can delete all
CREATE POLICY "selections_delete_own_or_admin"
ON public.selections
FOR DELETE
TO authenticated
USING (
  user_email = auth.jwt()->>'email'
  OR
  (SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'
);

-- ============================================================================
-- 7. IMPORTANT NOTES FOR API ROUTES
-- ============================================================================
-- For user registration and admin operations that require bypassing RLS,
-- use the service_role key in backend API routes (NOT the anon key).
--
-- Example for registration (use in API route with service_role):
--   const supabaseAdmin = createClient(
--     process.env.SUPABASE_URL,
--     process.env.SUPABASE_SERVICE_ROLE_KEY
--   );
--   const { data, error } = await supabaseAdmin.from('users').insert({...});
--
-- The anon key used in the client will respect RLS and prevent unauthorized access.

-- ============================================================================
-- 8. VERIFICATION QUERIES (run these to verify RLS is working)
-- ============================================================================

-- Check that RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'cooling_tower_models', 'cooling_tower_performance', 'selections');

-- Check policies on a table
-- SELECT tablename, policyname, permissive, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'selections';
