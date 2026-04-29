# RLS Implementation Deployment Checklist

## Pre-Deployment ✓

- [ ] Review `RLS-DEPLOYMENT-GUIDE.md` completely
- [ ] Backup your Supabase database (optional but recommended)
- [ ] Have your Supabase URL and keys ready
- [ ] Ensure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set

## Database Setup

- [ ] Execute SQL script from `RLS-Implementation.sql` in Supabase SQL Editor
- [ ] Run verification query to confirm RLS is enabled:
  ```sql
  SELECT schemaname, tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' AND tablename IN ('users', 'cooling_tower_models', 'cooling_tower_performance', 'selections');
  ```
- [ ] Verify all four tables show `rowsecurity = true`

## Code Deployment

- [ ] Updated files are deployed:
  - [ ] `/app/lib/supabaseClient.js`
  - [ ] `/app/admin-dashboard/page.js`
  - [ ] `/app/admin-dashboard/register/page.js`
  - [ ] `/app/viewUser/[email]/page.js`
  - [ ] `/app/api/auth/register/route.js` (NEW)
  - [ ] `/app/api/admin/users/route.js` (NEW)
  - [ ] `/app/api/admin/users/[email]/route.js` (NEW)
  - [ ] `/app/api/admin/selections/route.js` (NEW)
  - [ ] `/app/api/admin/selections/[id]/route.js` (NEW)

- [ ] Environment variables are correctly set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

- [ ] Application is restarted/redeployed

## Basic Functionality Tests

### Login & Registration
- [ ] Can log in with valid credentials
- [ ] Can register new user from Admin Dashboard
- [ ] Can log out successfully
- [ ] Cannot log in with invalid credentials

### User Data Access
- [ ] Logged-in user can see their own profile in "Account Details"
- [ ] User can view their own selections
- [ ] User cannot view other users' selections
- [ ] User can update their own profile

### Reference Data Access
- [ ] Cooling tower models display correctly
- [ ] Performance curve page loads
- [ ] Can generate selections with models and performance data

### Admin Functionality
- [ ] Admin can view all users in Admin Dashboard
- [ ] Admin can view all selections in Admin Dashboard
- [ ] Admin can delete users
- [ ] Admin can delete selections
- [ ] Admin can view and edit any user's profile
- [ ] Admin can register new users

### ViewUser Page (Admin)
- [ ] Can navigate to ViewUser page from Admin Dashboard
- [ ] Can see user details
- [ ] Can edit user details
- [ ] Can send password reset email
- [ ] Can return to Admin Dashboard

### Data Isolation Verification
- [ ] Create Test User A
- [ ] Create Test User B
- [ ] Log in as User A, create a selection
- [ ] Log out, log in as User B
- [ ] Verify User B cannot see User A's selection
- [ ] Verify User B can only see their own selections

## Performance & Load Testing

- [ ] Admin Dashboard loads in < 3 seconds with many selections
- [ ] ViewUser page loads in < 2 seconds
- [ ] Register page creates users successfully under load
- [ ] No N+1 query issues in browser console

## Security Verification

- [ ] Check `.env.local` - `SUPABASE_SERVICE_ROLE_KEY` is NOT in git
- [ ] Verify API routes return 401 for unauthenticated requests
- [ ] Verify API routes return 403 for non-admin users accessing admin endpoints
- [ ] Browser Network tab shows no exposed service role key
- [ ] All API requests include valid Authorization header

## Error Handling

- [ ] Display appropriate error messages for failed operations
- [ ] Show loading states during data fetching
- [ ] Handle network errors gracefully
- [ ] No console errors in development mode

## Documentation

- [ ] `RLS-Implementation.sql` is stored safely
- [ ] `RLS-DEPLOYMENT-GUIDE.md` is accessible to team
- [ ] API route purposes are documented in route files
- [ ] Team is trained on the new system

## Post-Deployment

- [ ] Monitor application for errors
- [ ] Check database logs for any permission issues
- [ ] Verify email confirmations work
- [ ] Test password reset functionality
- [ ] Review Supabase dashboard for any warnings

## Rollback Plan (if needed)

- [ ] Rollback SQL script is prepared
- [ ] Previous deployment package is backed up
- [ ] Rollback can be executed in < 5 minutes if needed

## Sign-Off

- [ ] Project Owner Approval: _________________ Date: _______
- [ ] Database Admin Approval: _________________ Date: _______
- [ ] QA Approval: _________________ Date: _______

## Notes

Use this section to document any issues or customizations made:

```
_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________
```
