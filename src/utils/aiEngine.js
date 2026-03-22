// AI Replacement Value Engine
// Simulates an AI model that estimates replacement costs based on:
// - Asset type, age, condition, manufacturer tier, and market inflation

const INFLATION_RATE = 0.042; // 4.2% annual construction/equipment inflation

const MANUFACTURER_TIER = {
  // Premium tier (1.3x)
  'Carrier': 1.3, 'Trane': 1.3, 'KONE': 1.3, 'Otis': 1.25,
  'Cisco': 1.35, 'Lutron': 1.3, 'Caterpillar': 1.35,
  'Rational': 1.3, 'Hobart': 1.25, 'Notifier / Honeywell': 1.2,
  // Standard tier (1.0x)
  'Grundfos': 1.1, 'Eaton': 1.1, 'Siemens': 1.1, 'ASCO Power Technologies': 1.1,
  'A.O. Smith': 1.05, 'Pentair': 1.05, 'Patterson Pump': 1.05,
  'Garland': 1.0, 'Aruba Networks': 1.1, 'Mitel': 1.0,
  // Value tier (0.9x)
  'Zoeller': 0.9, 'Watts': 0.9, 'Lithonia Lighting': 0.9,
};

const CONDITION_MULTIPLIER = {
  'Excellent': 1.0,
  'Good': 1.05,
  'Fair': 1.15,   // Higher replacement urgency
  'Poor': 1.25,
};

export function calculateAIReplacementValue(asset) {
  const {
    aiReplacementValue: baseValue,
    installDate,
    manufacturer,
    condition,
  } = asset;

  const yearsOld = (new Date() - new Date(installDate)) / (1000 * 60 * 60 * 24 * 365);
  const inflationFactor = Math.pow(1 + INFLATION_RATE, yearsOld);
  const mfgTier = MANUFACTURER_TIER[manufacturer] || 1.0;
  const conditionMult = CONDITION_MULTIPLIER[condition] || 1.0;

  const adjustedValue = baseValue * inflationFactor * conditionMult;
  return Math.round(adjustedValue / 500) * 500; // Round to nearest $500
}

export function generateReplacementReport(assets) {
  const totalCurrentValue = assets.reduce(
    (sum, a) => sum + calculateAIReplacementValue(a), 0
  );
  const totalOriginalValue = assets.reduce(
    (sum, a) => sum + a.aiReplacementValue, 0
  );
  const inflationImpact = totalCurrentValue - totalOriginalValue;

  return {
    totalCurrentValue,
    totalOriginalValue,
    inflationImpact,
    inflationPercent: ((inflationImpact / totalOriginalValue) * 100).toFixed(1),
    assetCount: assets.length,
    generatedAt: new Date().toISOString(),
  };
}

export function getReplacementPriority(asset) {
  const warrantyExpiry = new Date(asset.warrantyExpiration);
  const today = new Date();
  const daysToWarrantyExpiry = (warrantyExpiry - today) / (1000 * 60 * 60 * 24);
  const yearsOld = (today - new Date(asset.installDate)) / (1000 * 60 * 60 * 24 * 365);

  let score = 0;
  if (asset.condition === 'Poor') score += 40;
  else if (asset.condition === 'Fair') score += 20;
  else if (asset.condition === 'Good') score += 5;

  if (daysToWarrantyExpiry < 0) score += 25;
  else if (daysToWarrantyExpiry < 180) score += 15;

  if (yearsOld > 15) score += 20;
  else if (yearsOld > 10) score += 10;
  else if (yearsOld > 7) score += 5;

  if (score >= 50) return { label: 'Critical', color: '#FF4757', score };
  if (score >= 30) return { label: 'High', color: '#FFA502', score };
  if (score >= 15) return { label: 'Medium', color: '#FFD93D', score };
  return { label: 'Low', color: '#2ED573', score };
}

export function formatCurrency(value) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatCurrencyFull(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
