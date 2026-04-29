import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/users/[email] - Get specific user
 * DELETE /api/admin/users/[email] - Delete a user
 * PATCH /api/admin/users/[email] - Update a user
 * 
 * Requires:
 * - User must be authenticated
 * - User must have superadmin role
 */

async function getAdminClient(authHeader) {
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: userData, error: userDataError } = await adminClient
    .from('users')
    .select('role')
    .eq('email', user.email)
    .single();

  if (userDataError || !userData || userData.role !== 'superadmin') {
    throw new Error('Admin access required');
  }

  return adminClient;
}

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const adminClient = await getAdminClient(authHeader);
    const email = decodeURIComponent(params.email);

    const { data: user, error } = await adminClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });

  } catch (error) {
    const statusCode = error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500;
    return NextResponse.json(
      { error: error.message },
      { status: statusCode }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const adminClient = await getAdminClient(authHeader);
    const email = decodeURIComponent(params.email);

    // Delete from users table
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('email', email);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const statusCode = error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500;
    return NextResponse.json(
      { error: error.message },
      { status: statusCode }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const adminClient = await getAdminClient(authHeader);
    const email = decodeURIComponent(params.email);

    // Update user
    const { data: user, error } = await adminClient
      .from('users')
      .update(body)
      .eq('email', email)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ user });

  } catch (error) {
    const statusCode = error.message === 'Unauthorized' ? 401 : error.message === 'Admin access required' ? 403 : 500;
    return NextResponse.json(
      { error: error.message },
      { status: statusCode }
    );
  }
}
