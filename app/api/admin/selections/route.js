import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/selections
 * Fetches all selections (admin-only operation)
 * 
 * Requires:
 * - User must be authenticated
 * - User must have superadmin role
 */

export async function GET(request) {
  try {
    // Get the user's session from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Create a client with the user's token to verify they're authenticated
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify user and check if they're a superadmin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create admin client to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if user is superadmin
    const { data: userData, error: userDataError } = await adminClient
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userDataError || !userData || userData.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all selections
    const { data: selections, error: selectionsError } = await adminClient
      .from('selections')
      .select('id, user_email, project_name, location, date_created')
      .order('date_created', { ascending: false });

    if (selectionsError) {
      console.error('Error fetching selections:', selectionsError);
      return NextResponse.json(
        { error: selectionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ selections });

  } catch (error) {
    console.error('Admin selections endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
