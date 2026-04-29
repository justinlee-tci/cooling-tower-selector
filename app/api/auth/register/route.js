import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/register
 * 
 * Registers a new user using the service role key (bypasses RLS)
 * Should only be called by authenticated superadmin users
 * 
 * Body:
 * - email: string
 * - password: string
 * - name: string
 * - company: string
 * - country: string
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, company, country } = body;

    // Validate required fields
    if (!email || !password || !name || !company || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase admin client using service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Step 1: Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      );
    }

    // Step 2: Insert user into users table with service role
    const { data: userData, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([{
        email,
        name,
        password, // Note: You may want to hash this separately if storing in DB
        company,
        country,
        role: 'user',
        last_logged_in: null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      
      // If insert failed, try to delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      user: {
        email: userData.email,
        name: userData.name,
        company: userData.company,
        country: userData.country,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
