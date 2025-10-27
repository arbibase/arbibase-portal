import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { RadarItem } from '@/types/roi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const top = parseInt(searchParams.get('top') || '5');

    if (!supabase) {
      // Return mock data if Supabase not configured
      return NextResponse.json(getMockRadarData(top));
    }

    // TODO: Query market_metrics table when available
    // For now, aggregate from properties table
    const { data: properties, error } = await supabase
      .from('properties')
      .select('city, state, revenue_monthly_est, adr_estimate, verified')
      .not('city', 'is', null)
      .not('state', 'is', null);

    if (error || !properties || properties.length === 0) {
      return NextResponse.json(getMockRadarData(top));
    }

    // Group by market (city, state)
    const marketMap = new Map<string, { count: number, avgRev: number, verified: number }>();
    
    properties.forEach(p => {
      const key = `${p.city}, ${p.state}`;
      const existing = marketMap.get(key) || { count: 0, avgRev: 0, verified: 0 };
      marketMap.set(key, {
        count: existing.count + 1,
        avgRev: existing.avgRev + (p.revenue_monthly_est || 0),
        verified: existing.verified + (p.verified ? 1 : 0)
      });
    });

    // Convert to radar items with scores
    const radarItems: RadarItem[] = Array.from(marketMap.entries())
      .map(([label, stats]) => {
        const avgRev = stats.count > 0 ? stats.avgRev / stats.count : 0;
        // Score based on avg revenue (normalize to 0-100)
        const score = Math.min(100, Math.round((avgRev / 5000) * 100));
        // Simple trend: if score > 60 = up, < 40 = down, else flat
        const trend = score > 60 ? 'up' : score < 40 ? 'down' : 'flat';
        
        return {
          marketId: label.toLowerCase().replace(/[, ]+/g, '-'),
          label: label.split(',')[0], // Just city name
          score,
          trend
        } as RadarItem;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, top);

    return NextResponse.json(radarItems);

  } catch (error) {
    console.error('Market radar error:', error);
    return NextResponse.json(getMockRadarData(5));
  }
}

function getMockRadarData(count: number): RadarItem[] {
  const mock: RadarItem[] = [
    { marketId: 'austin-tx', label: 'Austin', score: 82, trend: 'up' },
    { marketId: 'nashville-tn', label: 'Nashville', score: 78, trend: 'up' },
    { marketId: 'miami-fl', label: 'Miami', score: 74, trend: 'flat' },
    { marketId: 'denver-co', label: 'Denver', score: 71, trend: 'down' },
    { marketId: 'seattle-wa', label: 'Seattle', score: 68, trend: 'flat' },
  ];
  return mock.slice(0, count);
}