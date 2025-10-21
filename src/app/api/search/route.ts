import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ results: [] }, { status: 500 });
    }

    const sb = supabase;

    let query = sb
      .from('properties')
      .select('*')
      .eq('verified', true);
    
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }
    
    const { data, error } = await query.limit(50);
    
    if (error) throw error;
    
    return NextResponse.json({ results: data || [] });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}