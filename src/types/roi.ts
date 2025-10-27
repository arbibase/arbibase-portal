export type RoiEstimates = {
  adr_estimate: number | null;
  occ_estimate: number | null;        // 0..1
  expense_rate: number | null;        // 0..1
  revenue_monthly_est: number | null;
  revenue_annual_est: number | null;
  roi_score_local: number | null;     // 0..100
}

export type RadarItem = { 
  marketId: string; 
  label: string; 
  score: number; 
  trend: 'up' | 'down' | 'flat' 
}

export type RoiDrawerProps = {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  name: string;
  city?: string;
  state?: string;
  beds?: number;
  baths?: number;
  adrInitial?: number | null;
  occInitial?: number | null;
  expenseInitial?: number | null;
}