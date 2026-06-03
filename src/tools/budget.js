export const budgetSchema = {
  name: "manage_budget",
  description: "Set, retrieve, or check budget limits for different spending categories. Can set a monthly budget, check remaining budget, or update existing budgets.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["set", "get", "check"],
        description: "Action to perform: 'set' to create/update a budget, 'get' to retrieve all budgets, 'check' to check remaining budget"
      },
      category: {
        type: "string",
        description: "Budget category (e.g., 'groceries', 'entertainment', 'transport'). Required for 'set' and 'check'."
      },
      amount: {
        type: "number",
        description: "Budget amount in USD. Required for 'set' action."
      }
    },
    required: ["action"]
  }
};

// In-memory budget store (would be persistent DB in production)
const budgets = {
  groceries: { limit: 500, spent: 0 },
  entertainment: { limit: 200, spent: 0 },
  transport: { limit: 300, spent: 0 }
};

export function manageBudget({ action, category, amount }) {
  switch (action) {
    case "set": {
      if (!category || amount === undefined) {
        throw new Error("'set' action requires 'category' and 'amount'");
      }
      budgets[category.toLowerCase()] = { limit: amount, spent: 0 };
      return {
        success: true,
        message: `Budget set for ${category}: $${amount}`,
        budget: budgets[category.toLowerCase()]
      };
    }

    case "get": {
      return {
        success: true,
        budgets: budgets,
        summary: Object.entries(budgets).map(([cat, data]) => ({
          category: cat,
          limit: data.limit,
          spent: data.spent,
          remaining: data.limit - data.spent,
          percentUsed: ((data.spent / data.limit) * 100).toFixed(1)
        }))
      };
    }

    case "check": {
      if (!category) {
        throw new Error("'check' action requires 'category'");
      }
      const cat = category.toLowerCase();
      if (!budgets[cat]) {
        return {
          success: false,
          error: `Budget for category '${category}' not found`,
          availableCategories: Object.keys(budgets)
        };
      }
      const budget = budgets[cat];
      return {
        success: true,
        category: category,
        limit: budget.limit,
        spent: budget.spent,
        remaining: budget.limit - budget.spent,
        percentUsed: ((budget.spent / budget.limit) * 100).toFixed(1),
        isOver: budget.spent > budget.limit
      };
    }

    default:
      throw new Error(`Unknown budget action: ${action}`);
  }
}
