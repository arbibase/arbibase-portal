import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { adr, occ, expenseRate } = body;

    // Validate inputs
    if (typeof adr !== 'number' || typeof occ !== 'number' || typeof expenseRate !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Calculate metrics
    const monthly = Math.round(adr * (occ * 30));
    const annual = monthly * 12;

    // Calculate ROI score (naive normalized: ADR 0-500 -> 0-100, Occ 0-1 -> 0-100)
    const sAdr = Math.max(0, Math.min(100, (adr / 500) * 100));
    const sOcc = Math.max(0, Math.min(100, occ * 100));
    const roiScore = Math.round((sAdr * 0.6) + (sOcc * 0.4));

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // TODO: Ensure migration applied for these columns:
    // adr_estimate, occ_estimate, expense_rate, revenue_monthly_est, revenue_annual_est, roi_score_local
    
    const { data, error } = await supabase
      .from('properties')
      .update({
        adr_estimate: adr,
        occ_estimate: occ,
        expense_rate: expenseRate,
        revenue_monthly_est: monthly,
        revenue_annual_est: annual,
        roi_score_local: roiScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        adr_estimate: adr,
        occ_estimate: occ,
        expense_rate: expenseRate,
        revenue_monthly_est: monthly,
        revenue_annual_est: annual,
        roi_score_local: roiScore
      }
    });

  } catch (error) {
    console.error('ROI API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}