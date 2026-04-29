# RLS Implementation - Quick Reference

## What Was the Problem?

Your previous RLS implementation had issues because:

1. **Policies Didn't Account for Admins**: Regular RLS policies didn't have logic for superadmin access
2. **Client-Side Inserts Blocked**: The register page tried to insert directly into the users table with anon key, which RLS blocked
3. **Admin Dashboard Queries Failed**: Queries for "all selections" and "all users" were blocked because policies only allowed user-specific data

## How We Fixed It

### 1. Comprehensive RLS Policies
Now policies check:
- **For Users**: `email = auth.jwt()->>'email'` (can only access own data)
- **For Admins**: Also checks `(SELECT role FROM public.users WHERE email = auth.jwt()->>'email') = 'superadmin'` (can access all data)

### 2. API Routes for Operations
Instead of client-side code doing inserts/updates/deletes (which RLS blocks):
- Created backend API routes that use `SUPABASE_SERVICE_ROLE_KEY`
- These routes bypass RLS because service role has admin permissions
- Routes verify user is authenticated before allowing operations
- Routes check if user is superadmin before allowing admin operations

### 3. Updated Frontend
- Admin Dashboard now calls API routes to get all users/selections
- Register page now calls API route to create users
- ViewUser page now calls API routes to fetch/update user data

## Why This Works

```
User Login Flow:
1. Browser → User enters credentials
2. Supabase Auth → Validates credentials, returns JWT token
3. Client stores JWT in session
4. API Routes → Use JWT to verify identity and check role
5. Service Role Backend → Performs actual database operations
6. Results → Returned to client with proper authorization checks
```

## The Three Access Levels

### 1. Unauthenticated (Anon Key)
- Cannot access any data via RLS
- Used only for initial login

### 2. Authenticated Regular User (JWT Token)
- Can read: Own user profile, own selections, reference data (models, performance)
- Can write: Own profile, own selections
- Cannot read: Other users' profiles, other users' selections
- Cannot write: Other users' data, reference data

### 3. Authenticated Superadmin (JWT Token)
- Can read: All users, all selections, reference data
- Can write: All users, all selections
- Via API Routes: Can register users, delete users, delete selections

## Quick Testing

### Test 1: Verify User Isolation
```
1. Log in as User A
2. Create a selection named "Test Selection"
3. Get the selection ID from the URL
4. Log out and log in as User B
5. Try to access: /viewSelection/[selection-id]
6. Should see: Access denied (not found)
```

### Test 2: Verify Admin Access
```
1. Log in as Superadmin
2. Go to /admin-dashboard
3. Should see: All users and all selections
4. Should be able to: Delete any user or selection
```

### Test 3: Verify Reference Data Access
```
1. Log in as regular user
2. Go to /PerformanceCurve
3. Should see: Performance curves loading correctly
4. Should be able to: Generate reports
```

## Key Files Modified

| File | Purpose |
|------|---------|
| `RLS-Implementation.sql` | Database RLS policies |
| `supabaseClient.js` | Added API route helpers |
| `admin-dashboard/page.js` | Uses API routes for all admin operations |
| `admin-dashboard/register/page.js` | Uses API route for user registration |
| `viewUser/[email]/page.js` | Uses API routes for user view/edit |
| `api/auth/register/route.js` | API endpoint for user registration |
| `api/admin/users/route.js` | API endpoint to fetch all users |
| `api/admin/users/[email]/route.js` | API endpoints for user operations |
| `api/admin/selections/route.js` | API endpoint to fetch all selections |
| `api/admin/selections/[id]/route.js` | API endpoints for selection operations |

## Common Issues & Solutions

### Issue: "Unauthorized" errors on admin pages
**Solution**: User is not marked as superadmin. Check database:
```sql
SELECT email, role FROM public.users WHERE email = 'your-email';
```
Should show role as 'superadmin'.

### Issue: Performance curve not showing
**Solution**: cooling_tower_performance policy allows all authenticated users. Check your SQL execute succeeded.

### Issue: Can't register new users
**Solution**: Check that API route is deployed and `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`.

### Issue: "Failed to load selections" in admin dashboard
**Solution**: Check browser Network tab. If API returns 403, user is not admin. If it returns 401, session expired.

## Environment Setup

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # ⚠️ NEVER commit this!
```

## Production Deployment

1. Set environment variables in your hosting platform
2. Deploy the code changes
3. Run the SQL script in Supabase (one-time)
4. Test admin dashboard works
5. Test user login and data isolation
6. Monitor for errors in Supabase logs

## Support

If something doesn't work:
1. Check the `RLS-DEPLOYMENT-GUIDE.md` troubleshooting section
2. Look at the browser console for error messages
3. Check Network tab in DevTools for API responses
4. Verify environment variables are set
5. Make sure SQL script ran successfully
