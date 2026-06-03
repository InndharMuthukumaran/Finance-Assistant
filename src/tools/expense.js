import { logger } from '../utils/logger.js';

export const expenseSchema = {
  name: "track_expense",
  description: "Log, retrieve, or categorize expenses. Can add a new expense, list expenses by category, or get total spending.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "list", "total"],
        description: "Action to perform: 'add' to log an expense, 'list' to retrieve expenses by category, 'total' to get sum"
      },
      category: {
        type: "string",
        description: "Expense category (e.g., 'groceries', 'entertainment', 'transport'). Required for 'add' and 'list'."
      },
      amount: {
        type: "number",
        description: "Expense amount in USD. Required for 'add' action."
      },
      description: {
        type: "string",
        description: "Optional description of the expense (e.g., 'lunch at cafe'). Used with 'add'."
      }
    },
    required: ["action"]
  }
};

// In-memory expense store (would be persistent DB in production)
const expenses = [
  { id: 1, category: 'groceries', amount: 45.50, description: 'Weekly shopping', date: '2025-06-01' },
  { id: 2, category: 'entertainment', amount: 25.00, description: 'Movie tickets', date: '2025-06-02' },
  { id: 3, category: 'transport', amount: 12.50, description: 'Gas', date: '2025-06-02' },
  { id: 4, category: 'groceries', amount: 32.75, description: 'Fresh fruits', date: '2025-06-03' }
];

let nextId = 5;

export function trackExpense({ action, category, amount, description }) {
  switch (action) {
    case "add": {
      if (!category || amount === undefined) {
        throw new Error("'add' action requires 'category' and 'amount'");
      }
      const newExpense = {
        id: nextId++,
        category: category.toLowerCase(),
        amount: amount,
        description: description || 'No description',
        date: new Date().toISOString().split('T')[0]
      };
      expenses.push(newExpense);
      logger.debug(`Expense added: ${JSON.stringify(newExpense)}`);
      return {
        success: true,
        message: `Expense logged: $${amount} for ${category}`,
        expense: newExpense
      };
    }

    case "list": {
      if (!category) {
        // Return all expenses grouped by category
        const grouped = {};
        expenses.forEach(exp => {
          if (!grouped[exp.category]) grouped[exp.category] = [];
          grouped[exp.category].push(exp);
        });
        return {
          success: true,
          allExpenses: expenses,
          byCategory: grouped
        };
      } else {
        // Return expenses for specific category
        const cat = category.toLowerCase();
        const filtered = expenses.filter(exp => exp.category === cat);
        const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
        return {
          success: true,
          category: category,
          expenses: filtered,
          count: filtered.length,
          total: total.toFixed(2)
        };
      }
    }

    case "total": {
      if (!category) {
        // Total across all categories
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        return {
          success: true,
          totalSpent: total.toFixed(2),
          expenseCount: expenses.length,
          byCategory: Object.fromEntries(
            Array.from(
              new Map(
                expenses.map(exp => [
                  exp.category,
                  (expenses
                    .filter(e => e.category === exp.category)
                    .reduce((sum, e) => sum + e.amount, 0))
                ])
              )
            )
          )
        };
      } else {
        // Total for specific category
        const cat = category.toLowerCase();
        const filtered = expenses.filter(exp => exp.category === cat);
        const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
        return {
          success: true,
          category: category,
          total: total.toFixed(2),
          expenseCount: filtered.length
        };
      }
    }

    default:
      throw new Error(`Unknown expense action: ${action}`);
  }
}
