# Row-Level Security (RLS) Implementation Guide

## Overview
This document provides step-by-step instructions for deploying Row-Level Security (RLS) to your Cooling Tower Selector application. RLS ensures that users can only access their own data, and superadmins can access all data.

## Key Changes Made

### 1. Database Schema Changes
- **Enabled RLS** on all four tables:
  - `public.users`
  - `public.cooling_tower_models`
  - `public.cooling_tower_performance`
  - `public.selections`

### 2. RLS Policies
Implemented the following RLS policies:

#### Users Table
- **SELECT**: Users see own profile, superadmins see all users
- **UPDATE**: Users update own profile, superadmins update any user
- **INSERT/DELETE**: Blocked for authenticated users (use service role via API)

#### Cooling Tower Models (Reference Data)
- **SELECT**: All authenticated users can read
- **INSERT/UPDATE/DELETE**: Blocked (only service role)

#### Cooling Tower Performance (Reference Data)
- **SELECT**: All authenticated users can read
- **INSERT/UPDATE/DELETE**: Blocked (only service role)

#### Selections Table
- **SELECT**: Users see own selections, superadmins see all
- **INSERT**: Users can insert with their own email
- **UPDATE**: Users update own, superadmins update any
- **DELETE**: Users delete own, superadmins delete any

### 3. API Routes Created
New backend API routes that use the service role key to bypass RLS:

- `POST /api/auth/register` - Register new users (called from admin dashboard)
- `GET /api/admin/users` - Fetch all users (admin only)
- `GET /api/admin/users/[email]` - Fetch specific user (admin only)
- `DELETE /api/admin/users/[email]` - Delete user (admin only)
- `PATCH /api/admin/users/[email]` - Update user (admin only)
- `GET /api/admin/selections` - Fetch all selections (admin only)
- `GET /api/admin/selections/[id]` - Fetch specific selection (admin only)
- `DELETE /api/admin/selections/[id]` - Delete selection (admin only)

### 4. Frontend Components Updated
- **Admin Dashboard**: Uses API routes instead of direct database queries
- **ViewUser Page**: Uses API routes for fetching/updating user data
- **Register Page**: Uses API route for user registration
- **Supabase Client**: Added helper functions for common operations

## Deployment Instructions

### Step 1: Database Configuration (One-time Setup)

Execute the SQL script in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy and paste the contents of `/DB info/RLS-Implementation.sql`
5. Click "Run"
6. Wait for all commands to complete successfully

**Expected Result**: All four tables should have RLS enabled with appropriate policies.

### Step 2: Verify RLS is Enabled

In SQL Editor, run this verification query:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'cooling_tower_models', 'cooling_tower_performance', 'selections');
```

All tables should show `rowsecurity = true`.

### Step 3: Environment Variables

Ensure you have these environment variables set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ CRITICAL**: Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. It should only be in server-side `.env.local`.

### Step 4: Deploy Code Changes

1. Update your Next.js application with the new API routes and updated components
2. Deploy to your production environment
3. Verify all new API routes are accessible

### Step 5: Test the Implementation

#### Test 1: User Registration and Login
1. Go to Admin Dashboard → Register New User
2. Register a new user with test credentials
3. Log out and log in with the new credentials
4. Verify the login works correctly
5. Verify user can only see own selections

#### Test 2: Performance Curve Generation
1. As a logged-in user, create a selection
2. Go to the selection details page
3. Click "Generate Performance Curve"
4. Verify the performance curve displays correctly
5. Verify data loads from the cooling_tower_performance table

#### Test 3: Admin Dashboard Access
1. Log in as superadmin
2. Go to Admin Dashboard
3. Verify "Users" tab loads all users
4. Verify "Selections" tab loads all selections
5. Try to delete a user - should work
6. Try to delete a selection - should work

#### Test 4: User Isolation
1. Create two test users (user1 and user2)
2. Log in as user1, create a selection
3. Log out and log in as user2
4. Verify user2 CANNOT see user1's selections
5. Verify user2 can only see their own selections

#### Test 5: Data Access
1. Log in as any authenticated user
2. Verify you can view the PerformanceCurve page
3. Verify cooling tower models load correctly
4. Verify you can see your own profile
5. Try to edit your profile - should work
6. Try to view another user's profile (via URL) - should fail

## Troubleshooting

### Issue: "Failed to load selections" or similar data errors

**Possible Causes**:
1. RLS not properly enabled
2. Policies not created correctly
3. Missing JWT token in API requests

**Solutions**:
- Verify RLS is enabled: Run the verification query from Step 2
- Check browser console for 401/403 errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart the Next.js development server

### Issue: Can't log in with valid credentials

**Possible Causes**:
1. Users table RLS policy is too restrictive
2. Registration failed to create both auth user and users table entry

**Solutions**:
- Check if user exists in users table:
  ```sql
  SELECT email, name, role FROM public.users WHERE email = 'test@example.com';
  ```
- Check if user exists in auth.users:
  - Go to Supabase dashboard → Authentication → Users
- Try registering the user again via Admin Dashboard

### Issue: Performance curve not showing up

**Possible Causes**:
1. cooling_tower_performance table RLS policy is blocking reads
2. Model name doesn't match between selections and performance data

**Solutions**:
- Verify SELECT policy on cooling_tower_performance allows authenticated users:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'cooling_tower_performance';
  ```
- Check if performance data exists for the model:
  ```sql
  SELECT DISTINCT model_name FROM public.cooling_tower_performance;
  ```

### Issue: Admin can't see other users' selections or users

**Possible Causes**:
1. User is not marked as superadmin
2. API routes not deployed
3. Missing authorization header

**Solutions**:
- Verify user role in database:
  ```sql
  SELECT email, role FROM public.users WHERE email = 'admin@example.com';
  ```
- Check if user role is exactly 'superadmin' (case-sensitive)
- Verify API routes are responding with status 200
- Check browser Network tab to see API response

## Important Security Notes

1. **Service Role Key**: Keep this key secret and only use it on the backend (in API routes)
2. **Anon Key**: Safe to expose in client code; respects RLS policies
3. **JWT Verification**: API routes verify the user's JWT token before performing operations
4. **Admin Check**: Every admin API route double-checks that the user has superadmin role

## Rollback Instructions

If you need to revert RLS:

```sql
-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooling_tower_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooling_tower_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_service_role" ON public.users;
DROP POLICY IF EXISTS "users_delete_service_role" ON public.users;
-- ... (repeat for other tables/policies)
```

## Support & Verification

If you need to verify that RLS is working:

1. Create two test users
2. Log in as User A
3. Create a selection as User A
4. Log in as User B
5. Try to access User A's selection via URL - should get 401/403 error
6. Verify you can only see your own selections in the dashboard

This confirms that RLS is properly enforcing row-level access control.
