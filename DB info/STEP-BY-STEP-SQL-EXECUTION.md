# Database RLS Setup - Step-by-Step

## Step 1: Access Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in to your account
3. Select your Cooling Tower Selector project
4. In the left sidebar, click **"SQL Editor"**
5. Click **"New Query"** button

## Step 2: Prepare the SQL Script

You have two options:

### Option A: Copy from the file
1. Open the file: `DB info/RLS-Implementation.sql`
2. Select all the content (Ctrl+A)
3. Copy (Ctrl+C)

### Option B: Use Supabase directly
1. In SQL Editor, click "New Query"
2. Continue to Step 3

## Step 3: Execute the SQL Script

1. In the Supabase SQL Editor, paste the entire contents of `RLS-Implementation.sql`
2. You should see the SQL code in the editor
3. Click the blue **"Run"** button (or press Ctrl+Enter)
4. Wait 10-30 seconds for execution to complete

## Step 4: Verify Execution

After clicking "Run", you should see:

✓ **Success**: A list of commands executed with no errors
- `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
- `DROP POLICY IF EXISTS...`
- `CREATE POLICY...` (multiple times)
- etc.

❌ **Error**: Red error message

If you see an error:
1. **Read the error message carefully**
2. **Note the line number mentioned**
3. **Check that section of the SQL**
4. **See troubleshooting below**

## Step 5: Verify RLS is Enabled

Run this verification query to confirm RLS was enabled on all tables:

1. Click **"New Query"** to create a new query
2. Copy and paste this code:

```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'cooling_tower_models', 'cooling_tower_performance', 'selections')
ORDER BY tablename;
```

3. Click **"Run"**
4. You should see a table with 4 rows, all showing `rowsecurity = true`

**Expected Result**:
```
┌─────────────┬──────────────────────────────┬──────────────┐
│ schemaname  │ tablename                    │ rowsecurity  │
├─────────────┼──────────────────────────────┼──────────────┤
│ public      │ cooling_tower_models         │ true         │
│ public      │ cooling_tower_performance    │ true         │
│ public      │ selections                   │ true         │
│ public      │ users                        │ true         │
└─────────────┴──────────────────────────────┴──────────────┘
```

If all show `rowsecurity = true`, proceed to Step 6. ✓

## Step 6: Verify Policies are Created

Run this query to verify all RLS policies were created:

```sql
SELECT 
  tablename, 
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'cooling_tower_models', 'cooling_tower_performance', 'selections')
ORDER BY tablename, policyname;
```

Click **"Run"**

**Expected Result**: You should see multiple policies for each table (around 24 total):
- 4 policies for `users`
- 4 policies for `cooling_tower_models`
- 4 policies for `cooling_tower_performance`
- 4 policies for `selections`

Each should show:
- `permissive = true` (allows access)
- `cmd` = `SELECT`, `INSERT`, `UPDATE`, or `DELETE`

If you see all the policies, RLS is properly configured! ✓

## Step 7: Check Data Integrity

Verify your existing data wasn't affected:

```sql
-- Check users table
SELECT COUNT(*) as user_count FROM public.users;

-- Check selections table
SELECT COUNT(*) as selection_count FROM public.selections;

-- Check models table
SELECT COUNT(*) as model_count FROM public.cooling_tower_models;

-- Check performance data
SELECT COUNT(*) as performance_count FROM public.cooling_tower_performance;
```

All counts should match your previous counts. ✓

## Step 8: Test Basic Access (Optional)

If you have a test user, try this query:

```sql
-- Check if you can see the users table
-- (This might be blocked if RLS is working correctly)
SELECT * FROM public.users;
```

Note: This query might return no results if RLS is properly blocking unauthorized access. That's expected! ✓

## Step 9: Proceed to Code Deployment

Once all verification queries pass:

1. ✅ RLS is enabled on all tables
2. ✅ All policies are created
3. ✅ Existing data is intact
4. ✅ Database configuration is complete

Now proceed to deploy the Next.js code changes:
- Updated `/app/lib/supabaseClient.js`
- New API routes in `/app/api/`
- Updated admin components

## Troubleshooting

### Error: "Syntax error in SQL"

**Solution**:
1. Check the line number mentioned in the error
2. Look at that section of `RLS-Implementation.sql`
3. Common causes:
   - Copy/paste messed up quotes (use copy from file)
   - Missing semicolon
   - Wrong table name
4. Try copying smaller chunks and running separately

### Error: "Table does not exist"

**Solution**:
1. Make sure you have these 4 tables:
   - `public.users`
   - `public.cooling_tower_models`
   - `public.cooling_tower_performance`
   - `public.selections`
2. If a table is missing, create it first
3. Check your database schema in Supabase dashboard

### Error: "Function not found"

**Solution**:
1. This usually means `auth.jwt()` function doesn't exist
2. This is a Supabase built-in, should always exist
3. Try running the SQL in a fresh browser tab
4. Contact Supabase support if it persists

### Verification Query Shows "false" for rowsecurity

**Solution**:
1. RLS wasn't enabled successfully
2. Rerun the `RLS-Implementation.sql` script
3. Make sure you click "Run" after pasting
4. Check for any error messages

### "Permission denied" errors

**Solution**:
1. You need admin access to the Supabase project
2. Check your user role in project settings
3. Ask project owner to grant permissions
4. Switch to correct Supabase project

### Script Ran But RLS Still Not Working

**Solution**:
1. Did the script really complete? (Check for red error messages)
2. Run the verification queries again
3. Try a hard refresh (Ctrl+Shift+R) in browser
4. Restart the Next.js development server
5. Clear browser cache

## Summary Checklist

After following all steps, you should have:

- [ ] Copied the SQL script to Supabase SQL Editor
- [ ] Clicked "Run" and got no errors
- [ ] Verified RLS is enabled (all showing `true`)
- [ ] Verified policies are created (24 policies total)
- [ ] Verified data counts match
- [ ] Noted any special configuration needed
- [ ] Ready to deploy code changes

## Next Steps

1. **Verify SQL execution** (You are here)
2. **Deploy code changes** 
   - Update `app/lib/supabaseClient.js`
   - Add 5 new API routes
   - Update 3 components
3. **Set environment variables**
   - Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
4. **Restart development server**
5. **Test the application**
   - Log in as regular user
   - Create a selection
   - Try to view as different user (should fail)
   - Log in as admin
   - Verify admin dashboard works
   - Verify can see all users/selections

## Getting Help

If something doesn't work:

1. **Check the error message** - It usually tells you what's wrong
2. **Run verification queries** - They show the current state
3. **Review the deployment guide** - `RLS-DEPLOYMENT-GUIDE.md`
4. **Check the quick reference** - `RLS-QUICK-REFERENCE.md`
5. **Contact Supabase support** - If it's a platform issue

You've got this! The SQL script is well-tested and should work on any Supabase project. 🚀
