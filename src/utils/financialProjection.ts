export interface ProjectionInput {
  currentInvestment: number;
  monthlyContribution: number;
  targetAmount: number;
  annualReturnRate: number;
}

export interface ProjectionResult {
  monthsToTarget: number | null;
  yearsToTarget: number | null;
  targetDate: Date | null;
  projectionData: ProjectionDataPoint[];
  finalValue: number;
  totalContributed: number;
  totalGain: number;
}

export interface ProjectionDataPoint {
  month: number;
  date: string;
  projectedValue: number;
  totalContributed: number;
  gains: number;
}

export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const { currentInvestment, monthlyContribution, targetAmount, annualReturnRate } = input;
  const monthlyRate = annualReturnRate / 12;
  const projectionData: ProjectionDataPoint[] = [];
  const startDate = new Date();
  let monthsToTarget: number | null = null;
  const maxMonths = 720;

  for (let month = 0; month <= maxMonths; month++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);
    let projectedValue: number;
    if (monthlyRate === 0) {
      projectedValue = currentInvestment + monthlyContribution * month;
    } else {
      projectedValue = currentInvestment * Math.pow(1 + monthlyRate, month) +
        monthlyContribution * ((Math.pow(1 + monthlyRate, month) - 1) / monthlyRate);
    }
    const totalContributed = currentInvestment + monthlyContribution * month;
    const gains = projectedValue - totalContributed;
    projectionData.push({
      month,
      date: date.toISOString().split('T')[0],
      projectedValue: Math.round(projectedValue * 100) / 100,
      totalContributed: Math.round(totalContributed * 100) / 100,
      gains: Math.round(gains * 100) / 100
    });
    if (monthsToTarget === null && projectedValue >= targetAmount) monthsToTarget = month;
  }

  const finalValue = projectionData[projectionData.length - 1]?.projectedValue || 0;
  const totalContributed = currentInvestment + monthlyContribution * maxMonths;
  let targetDate: Date | null = null;
  let yearsToTarget: number | null = null;
  if (monthsToTarget !== null) {
    targetDate = new Date(startDate);
    targetDate.setMonth(targetDate.getMonth() + monthsToTarget);
    yearsToTarget = Math.round((monthsToTarget / 12) * 10) / 10;
  }

  return {
    monthsToTarget,
    yearsToTarget,
    targetDate,
    projectionData,
    finalValue,
    totalContributed,
    totalGain: finalValue - totalContributed
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B';
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'K';
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}
