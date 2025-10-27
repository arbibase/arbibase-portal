type Property = {
  id: string;
  rent: number;
  beds: number;
  baths: number;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  verified: boolean;
  photo_url?: string;
  created_at?: string;
  // Additional scoring fields
  str_rate_estimate?: number;
  walkability_score?: number;
  distance_to_downtown?: number;
  nearby_str_count?: number;
  regulation_risk?: "low" | "medium" | "high";
  landlord_friendliness?: number;
  seasonal_variance?: number;
};

export type LeadScore = {
  propertyId: string;
  totalScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  spreadScore: number;
  locationScore: number;
  competitionScore: number;
  regulationScore: number;
  seasonalityScore: number;
  breakdown: {
    spread: number;
    spreadPercent: number;
    walkScore: number;
    distanceKm: number;
    competitorCount: number;
    regulationRisk: string;
    seasonalVariance: number;
  };
};

export function calculateLeadScore(property: Property): LeadScore {
  // 1. Spread Score (40 points) - Most important
  const strRate = property.str_rate_estimate || estimateStrRate(property);
  const monthlyStrRevenue = strRate * 30 * 0.7; // 70% occupancy assumption
  const spread = monthlyStrRevenue - property.rent;
  const spreadPercent = (spread / property.rent) * 100;
  
  let spreadScore = 0;
  if (spreadPercent > 100) spreadScore = 40;
  else if (spreadPercent > 75) spreadScore = 35;
  else if (spreadPercent > 50) spreadScore = 30;
  else if (spreadPercent > 25) spreadScore = 20;
  else spreadScore = 10;

  // 2. Location Score (25 points) - Walkability + Downtown proximity
  const walkScore = property.walkability_score || 50;
  const distanceKm = property.distance_to_downtown || 10;
  
  const walkScorePoints = (walkScore / 100) * 15; // Max 15 points
  const distancePoints = Math.max(0, 10 - distanceKm); // Max 10 points (closer = better)
  const locationScore = walkScorePoints + distancePoints;

  // 3. Competition Score (15 points) - Fewer STRs nearby = better
  const nearbyCount = property.nearby_str_count || 20;
  let competitionScore = 0;
  if (nearbyCount < 10) competitionScore = 15;
  else if (nearbyCount < 20) competitionScore = 12;
  else if (nearbyCount < 30) competitionScore = 8;
  else if (nearbyCount < 50) competitionScore = 5;
  else competitionScore = 2;

  // 4. Regulation Score (15 points) - Lower risk = better
  const regRisk = property.regulation_risk || "medium";
  let regulationScore = 0;
  if (regRisk === "low") regulationScore = 15;
  else if (regRisk === "medium") regulationScore = 10;
  else regulationScore = 3;

  // 5. Seasonality Score (5 points) - Lower variance = better for MTR pivot
  const variance = property.seasonal_variance || 30;
  let seasonalityScore = 0;
  if (variance < 20) seasonalityScore = 5;
  else if (variance < 40) seasonalityScore = 3;
  else seasonalityScore = 1;

  // Calculate total
  const totalScore = Math.round(
    spreadScore + locationScore + competitionScore + regulationScore + seasonalityScore
  );

  // Assign grade
  let grade: "A+" | "A" | "B" | "C" | "D";
  if (totalScore >= 90) grade = "A+";
  else if (totalScore >= 80) grade = "A";
  else if (totalScore >= 70) grade = "B";
  else if (totalScore >= 60) grade = "C";
  else grade = "D";

  return {
    propertyId: property.id,
    totalScore,
    grade,
    spreadScore,
    locationScore,
    competitionScore,
    regulationScore,
    seasonalityScore,
    breakdown: {
      spread,
      spreadPercent,
      walkScore,
      distanceKm,
      competitorCount: nearbyCount,
      regulationRisk: regRisk,
      seasonalVariance: variance,
    },
  };
}

function estimateStrRate(property: Property): number {
  // Simple estimation based on beds/baths/location
  // TODO: Replace with real comp analysis or AirDNA API
  const baseRate = 80;
  const bedMultiplier = property.beds * 25;
  const bathMultiplier = property.baths * 15;
  
  // City premium
  const premiumCities = ["Austin", "Nashville", "Tampa", "Miami", "Denver"];
  const cityPremium = premiumCities.includes(property.city) ? 30 : 0;
  
  return baseRate + bedMultiplier + bathMultiplier + cityPremium;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-emerald-300";
  if (score >= 70) return "text-amber-400";
  if (score >= 60) return "text-amber-300";
  return "text-white/60";
}

export function getScoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-500/10 border-emerald-400/30";
  if (score >= 80) return "bg-emerald-500/10 border-emerald-400/20";
  if (score >= 70) return "bg-amber-500/10 border-amber-400/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-400/20";
  return "bg-white/5 border-white/10";
}

export function getGradeBadge(grade: string): { bg: string; text: string } {
  switch (grade) {
    case "A+":
      return { bg: "bg-emerald-500", text: "text-white" };
    case "A":
      return { bg: "bg-emerald-400", text: "text-white" };
    case "B":
      return { bg: "bg-amber-400", text: "text-white" };
    case "C":
      return { bg: "bg-amber-500", text: "text-white" };
    default:
      return { bg: "bg-gray-500", text: "text-white" };
  }
}
