import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/selections/[id] - Get specific selection
 * DELETE /api/admin/selections/[id] - Delete a selection
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
    const selectionId = params.id;

    const { data: selection, error } = await adminClient
      .from('selections')
      .select('*')
      .eq('id', selectionId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ selection });

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
    const selectionId = params.id;

    // Delete selection
    const { error: deleteError } = await adminClient
      .from('selections')
      .delete()
      .eq('id', selectionId);

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
