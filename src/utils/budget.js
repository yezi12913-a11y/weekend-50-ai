const costTypeLabels = {
  transport: "交通",
  food: "餐饮/饮品",
  ticket: "门票",
  activity: "活动",
  other: "其他"
};

export function normalizeCost(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function calculateRouteBudget(route) {
  const breakdown = {
    transportCost: 0,
    foodCost: 0,
    ticketCost: 0,
    activityCost: 0,
    otherCost: 0
  };

  (route?.steps || []).forEach((step) => {
    const cost = normalizeCost(step.cost);
    if (step.costType === "transport") breakdown.transportCost += cost;
    else if (step.costType === "food") breakdown.foodCost += cost;
    else if (step.costType === "ticket") breakdown.ticketCost += cost;
    else if (step.costType === "activity") breakdown.activityCost += cost;
    else breakdown.otherCost += cost;
  });

  const totalCost = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return { ...breakdown, totalCost };
}

export function getBudgetStatus(totalCost, userBudget) {
  const budget = normalizeCost(userBudget) || 50;
  if (totalCost <= Math.floor(budget * 0.9)) {
    return { label: "低于预算，比较稳妥", level: "safe", isOverBudget: false };
  }
  if (totalCost <= budget) {
    return { label: "预算较紧", level: "tight", isOverBudget: false };
  }
  return { label: "超出预算", level: "over", isOverBudget: true };
}

export function formatBudgetBreakdown(route) {
  const budget = calculateRouteBudget(route);
  return [
    [costTypeLabels.transport, budget.transportCost],
    [costTypeLabels.food, budget.foodCost],
    [costTypeLabels.ticket, budget.ticketCost],
    [costTypeLabels.activity, budget.activityCost],
    [costTypeLabels.other, budget.otherCost]
  ].map(([label, value]) => `${label}：${value}元`).join("\n");
}

export function attachBudgetSummary(route, userBudget) {
  const budget = calculateRouteBudget(route);
  const status = getBudgetStatus(budget.totalCost, userBudget);
  const usageRate = Math.round((budget.totalCost / (normalizeCost(userBudget) || 50)) * 100);

  return {
    ...route,
    ...budget,
    estimatedCost: budget.totalCost,
    budgetStatus: status.label,
    budgetStatusLevel: status.level,
    budgetWarning: status.isOverBudget,
    budgetUsageRate: usageRate
  };
}
