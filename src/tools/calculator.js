export const calculatorSchema = {
  name: "calculate",
  description: "Perform basic arithmetic operations: add, subtract, multiply, divide, and calculate percentages.",
  input_schema: {
    type: "object",
    properties: {
      operation: { 
        type: "string", 
        enum: ["add", "subtract", "multiply", "divide", "percentage"],
        description: "The math operation to perform"
      },
      a: { type: "number", description: "The first operand (or total value for percentage)" },
      b: { type: "number", description: "The second operand (or percentage percentage value for percentage)" }
    },
    required: ["operation", "a", "b"]
  }
};

export function calculate({ operation, a, b }) {
  switch (operation) {
    case "add":
      return { result: a + b };
    case "subtract":
      return { result: a - b };
    case "multiply":
      return { result: a * b };
    case "divide":
      if (b === 0) {
        throw new Error("Division by zero is not allowed.");
      }
      return { result: a / b };
    case "percentage":
      return { result: (a * b) / 100 };
    default:
      throw new Error(`Unknown math operation: ${operation}`);
  }
}
