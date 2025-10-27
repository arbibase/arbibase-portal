import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = request.headers.get('cookie');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.split('=')[1]
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, github_url, linkedin_url, twitter_url, website_url } = body;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        phone,
        github_url,
        linkedin_url,
        twitter_url,
        website_url,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
