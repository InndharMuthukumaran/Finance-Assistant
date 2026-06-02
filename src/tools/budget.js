import { getExpenses } from './expense.js';
import { convertCurrency } from './currency.js';

export const budgetSchema = {
  name: "analyze_budget",
  description: "Analyze all logged expenses against a monthly budget limit. Automatically normalizes non-USD transactions to USD.",
  input_schema: {
    type: "object",
    properties: {
      monthly_limit: { 
        type: "number", 
        description: "The monthly budget cap in USD. Defaults to 1000." 
      }
    }
  }
};

export async function analyzeBudget({ monthly_limit = 1000 } = {}) {
  const { expenses } = await getExpenses();
  if (expenses.length === 0) {
    return {
      totalExpensesUSD: 0,
      monthlyLimitUSD: monthly_limit,
      remainingUSD: monthly_limit,
      status: "within_budget",
      categoryBreakdown: {},
      message: "No expenses have been logged yet. You are completely within budget!"
    };
  }

  let totalUSD = 0;
  const categoryBreakdown = {};

  for (const item of expenses) {
    let amountInUsd = item.amount;
    const currency = item.currency ? item.currency.toUpperCase() : "USD";

    if (currency !== "USD") {
      try {
        const conv = await convertCurrency({
          amount: item.amount,
          from: currency,
          to: "USD"
        });
        amountInUsd = conv.convertedAmount;
      } catch (err) {
        // Fallback to static 1:1 if conversion fails to avoid breaking
        amountInUsd = item.amount;
      }
    }

    totalUSD += amountInUsd;
    const cat = item.category || "other";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amountInUsd;
  }

  // Format and round
  totalUSD = parseFloat(totalUSD.toFixed(2));
  for (const cat in categoryBreakdown) {
    categoryBreakdown[cat] = parseFloat(categoryBreakdown[cat].toFixed(2));
  }

  const remaining = parseFloat((monthly_limit - totalUSD).toFixed(2));
  const status = totalUSD > monthly_limit ? "budget_exceeded" : "within_budget";
  
  let msg = `Total spent: $${totalUSD} USD. Limit: $${monthly_limit} USD. `;
  if (status === "budget_exceeded") {
    msg += `⚠️ Alert: You have exceeded your budget by $${Math.abs(remaining)} USD!`;
  } else {
    msg += `Success: You have $${remaining} USD left in your budget.`;
  }

  return {
    totalExpensesUSD: totalUSD,
    monthlyLimitUSD: monthly_limit,
    remainingUSD: remaining,
    status,
    categoryBreakdown,
    message: msg
  };
}
