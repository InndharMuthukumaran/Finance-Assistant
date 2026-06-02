import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPENSE_FILE_PATH = path.resolve(__dirname, '../data/expenses.json');

function ensureFileExists() {
  const dir = path.dirname(EXPENSE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(EXPENSE_FILE_PATH)) {
    fs.writeFileSync(EXPENSE_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

export const expenseSchemas = [
  {
    name: "add_expense",
    description: "Log a new expense in the local ledger. Checks parameter validation before writing.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Description of the purchase (e.g. Rent, Grocery shopping)" },
        amount: { type: "number", description: "Money spent (must be a positive floating-point number)" },
        currency: { type: "string", description: "3-letter currency code (e.g., USD, EUR, INR). Defaults to USD." },
        category: {
          type: "string",
          enum: ["food", "transportation", "housing", "utilities", "entertainment", "healthcare", "other"],
          description: "Spending category."
        }
      },
      required: ["description", "amount"]
    }
  },
  {
    name: "get_expenses",
    description: "List all expenses currently saved in the local JSON database.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "delete_expense",
    description: "Remove an expense from the ledger using its unique ID.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique ID of the expense item to delete" }
      },
      required: ["id"]
    }
  }
];

export async function addExpense({ description, amount, currency = "USD", category = "other" }) {
  ensureFileExists();
  if (amount <= 0) {
    throw new Error(`Validation Error: Amount must be greater than zero. Received: ${amount}`);
  }

  const rawData = fs.readFileSync(EXPENSE_FILE_PATH, 'utf-8');
  const expenses = JSON.parse(rawData || '[]');

  const newExpense = {
    id: Math.random().toString(36).substring(2, 9),
    description,
    amount,
    currency: currency.toUpperCase(),
    category: category.toLowerCase(),
    date: new Date().toISOString()
  };

  expenses.push(newExpense);
  fs.writeFileSync(EXPENSE_FILE_PATH, JSON.stringify(expenses, null, 2), 'utf-8');

  return { 
    success: true, 
    message: `Logged: "${description}" (${amount} ${currency.toUpperCase()}) under category '${category}'`, 
    expense: newExpense 
  };
}

export async function getExpenses() {
  ensureFileExists();
  const rawData = fs.readFileSync(EXPENSE_FILE_PATH, 'utf-8');
  const expenses = JSON.parse(rawData || '[]');
  return { expenses };
}

export async function deleteExpense({ id }) {
  ensureFileExists();
  const rawData = fs.readFileSync(EXPENSE_FILE_PATH, 'utf-8');
  const expenses = JSON.parse(rawData || '[]');

  const index = expenses.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error(`Expense with ID "${id}" was not found.`);
  }

  const deleted = expenses.splice(index, 1)[0];
  fs.writeFileSync(EXPENSE_FILE_PATH, JSON.stringify(expenses, null, 2), 'utf-8');

  return { 
    success: true, 
    message: `Deleted expense: "${deleted.description}"`, 
    deletedExpense: deleted 
  };
}
