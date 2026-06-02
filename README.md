Finance Assistant - Tool Calling Patterns Learning Project
A hands-on project to understand all 12 tool calling patterns by building a personal finance assistant that uses the Claude API.
What You'll Learn
This project demonstrates:

Parallel Tool Calling — Multiple tools run simultaneously
Tool Chaining — Output of one tool becomes input to the next
Error Recovery — Gracefully handle and recover from failures
Dynamic Tool Selection — LLM picks the right tool based on intent
Tool Composition — Combine smaller tools into powerful workflows
Conditional Tool Calling — Different tools for different conditions
Tool Output Validation — Verify results before using them
Tool Call Limits & Rate Limiting — Prevent runaway tool usage
Cost Optimization — Cache results, avoid wasted API calls
Multi-Agent Tool Calling — Specialized agents collaborating
Human-in-the-Loop — User confirms before executing
Streaming Tool Responses — Progressive output as it arrives

Project Structure
finance-assistant/
│
├── .env                                ← API keys & config (DO NOT COMMIT)
├── .env.example                        ← Template for .env (committed for reference)
├── .gitignore                          ← Exclude secrets, deps, logs
├── package.json                        ← Project metadata & scripts
├── README.md                           ← This file
│
├── src/                                ← Main application code
│   ├── index.js                        ← CLI entry point
│   │
│   ├── tools/                          ← Atomic tools (each does ONE thing)
│   │   ├── calculator.js               ├─ Add, subtract, multiply, divide, percentage
│   │   ├── currency.js                 ├─ Currency conversion & exchange rates
│   │   ├── expense.js                  ├─ Read/write expense JSON
│   │   └── budget.js                   └─ Budget analysis logic
│   │
│   ├── agents/                         ← Multi-agent orchestration
│   │   ├── orchestrator.js             ├─ Routes queries to sub-agents
│   │   ├── calculatorAgent.js          ├─ Handles math-heavy tasks
│   │   └── researchAgent.js            └─ Handles fetching & data tasks
│   │
│   ├── patterns/                       ← One file per concept (for learning)
│   │   ├── parallel.js                 ├─ Parallel tool calling
│   │   ├── chaining.js                 ├─ Tool chaining
│   │   ├── errorRecovery.js            ├─ Error handling & retries
│   │   ├── dynamicSelection.js         ├─ LLM picks tools
│   │   ├── composition.js              ├─ Combining tools
│   │   ├── conditional.js              ├─ Conditional routing
│   │   ├── validation.js               ├─ Output validation
│   │   ├── limits.js                   ├─ Rate limiting & counters
│   │   ├── costOptimize.js             ├─ Caching & optimization
│   │   ├── multiAgent.js               ├─ Multi-agent patterns
│   │   ├── humanInLoop.js              ├─ User confirmation
│   │   └── streaming.js                └─ Streaming responses
│   │
│   ├── utils/                          ← Shared utilities
│   │   ├── toolRunner.js               ├─ Central tool execution engine
│   │   ├── cache.js                    ├─ In-memory caching layer
│   │   ├── logger.js                   ├─ Logging all tool calls
│   │   ├── validation.js               ├─ Input/output validation
│   │   ├── config.js                   └─ Load & manage config
│   │
│   └── data/                           ← Data files (git-tracked)
│       └── expenses.json               └─ JSON array of expenses
│
├── examples/                           ← Standalone demos (one per concept)
│   ├── 01_parallel.js
│   ├── 02_chaining.js
│   ├── 03_error_recovery.js
│   ├── 04_dynamic_selection.js
│   ├── 05_composition.js
│   ├── 06_conditional.js
│   ├── 07_validation.js
│   ├── 08_limits.js
│   ├── 09_cost_optimize.js
│   ├── 10_multi_agent.js
│   ├── 11_human_in_loop.js
│   └── 12_streaming.js
│
├── tests/                              ← Unit tests (optional)
│   └── tools.test.js
│
└── node_modules/                       ← Dependencies (gitignored)
Creation Phases
Phase 1 (Initial Commit): Root files only

.env, .gitignore, package.json, README.md

Phase 2 (Commit 1): Basic tools

src/index.js, src/tools/calculator.js, src/tools/currency.js

Phase 3 (Commits 2-5): Patterns & utilities

src/utils/toolRunner.js, src/utils/logger.js, src/utils/cache.js
src/patterns/*.js (one per concept)

Phase 4 (Commits 6-9): Advanced features

src/agents/*.js, src/patterns/multiAgent.js, src/patterns/humanInLoop.js

Phase 5 (Commits 10+): Examples & polish

examples/.js, tests/.js, refinements


## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd finance-assistant
npm install
```

### 2. Set Up Environment

Copy the `.env.example` template and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key (get one free at [console.anthropic.com](https://console.anthropic.com)):

```env
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here
NODE_ENV=development
LOG_LEVEL=debug
MAX_TOOL_CALLS=10
CACHE_TTL_SECONDS=3600
```

**Important:** Never commit `.env` — it's in `.gitignore`. Only `.env.example` is tracked.

### 3. Create Data Directory

```bash
mkdir -p data
touch data/expenses.json
echo '[]' > data/expenses.json
```

## Quick Start

### Run the Main Assistant

```bash
npm start
```

Then try:
- `calculate 100 + 50`
- `convert 100 USD to INR`
- `track expense 50 USD lunch`
- `budget analysis`

### Run Examples (Learn Each Concept)

Each example demonstrates one pattern:

```bash
npm run example:01  # Parallel tool calling
npm run example:02  # Tool chaining
npm run example:03  # Error recovery
# ... and so on up to example:12
```

## Key Files to Understand First

1. **`src/index.js`** — Main entry point. Shows how CLI queries flow through the system.
2. **`src/utils/toolRunner.js`** — Central tool execution engine. See how tools are called.
3. **`src/tools/calculator.js`** — Your first atomic tool. Simple math operations.
4. **`src/tools/currency.js`** — Your second atomic tool. Currency conversion.

## How It Works

### The Flow
User Input
↓
CLI Parser (src/index.js)
↓
Tool Runner (src/utils/toolRunner.js)
↓
Claude API (decides which tool to use)
↓
Tool Execution (src/tools/*.js)
↓
Validation & Caching (src/utils/validation.js, src/utils/cache.js)
↓
Result to User

### Phased Learning

**Phase 1 — Basics** (commit 1)
- Single tool calling
- Calculator + Currency tools
- Simple sequential execution

**Phase 2 — Patterns** (commits 2-5)
- Parallel execution
- Tool chaining
- Dynamic selection
- Error recovery

**Phase 3 — Advanced** (commits 6-8)
- Validation & limits
- Cost optimization
- Multi-agent

**Phase 4 — Polish** (commits 9-12)
- Human-in-loop
- Streaming
- Full feature parity

## Tool Descriptions (for Claude to understand)

The system provides Claude with tool definitions. Each tool:
- Has a clear name and description
- Defines input parameters (types, constraints)
- Returns structured output (JSON)

Example tool definition:
```javascript
{
  name: "calculate",
  description: "Perform basic arithmetic: add, subtract, multiply, divide, percentage",
  input_schema: {
    type: "object",
    properties: {
      operation: { type: "string", enum: ["add", "subtract", "multiply", "divide", "percentage"] },
      a: { type: "number" },
      b: { type: "number" }
    },
    required: ["operation", "a", "b"]
  }
}
```

## Example Queries to Try

**Calculation:**
- "What is 25% of 200?"
- "Calculate 1500 + 2300 - 500"

**Currency:**
- "Convert 100 USD to INR"
- "How much is 50 EUR in GBP?"

**Chaining (calc → convert):**
- "Calculate 20% of 5000 and convert to USD"

**Composition (multiple tools):**
- "Budget analysis" (runs expense reader + calculator + advisor)

**Error handling:**
- "Convert 100 INVALID to INR" (handles bad currency gracefully)

**Limits:**
- Try 11+ tool calls in a row (hits max limit, shows message)

## Development Workflow

Each concept builds on the last. Recommended order:

1. Read the concept explanation (in comments)
2. Run the example: `npm run example:NN`
3. Read the example code
4. Modify it, break it, fix it
5. Commit when you understand it

```bash
git add .
git commit -m "Learn concept 1: Parallel tool calling"
```

## Configuration

All settings in `.env`:

- `ANTHROPIC_API_KEY` — Your Claude API key
- `NODE_ENV` — `development` or `production`
- `LOG_LEVEL` — `debug`, `info`, `warn`, `error`
- `MAX_TOOL_CALLS` — Max tools per request (default: 10)
- `CACHE_TTL_SECONDS` — Cache expiry in seconds (default: 3600)

## Debugging

Enable verbose logging:

```bash
LOG_LEVEL=debug npm start
```

This shows:
- Every tool call
- Tool inputs & outputs
- API latency
- Cache hits/misses
- Token usage

## Useful Links

- [Anthropic Documentation](https://docs.anthropic.com)
- [Claude API Reference](https://docs.anthropic.com/en/docs/intro)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)

## Next Steps

After understanding all 12 concepts:

1. Build a web UI (React) around the tool runner
2. Add real APIs (Stripe for payments, Alpha Vantage for stocks, etc.)
3. Deploy to a server (Node.js + Express)
4. Add authentication & multi-user support
5. Build a mobile app (same tool runner backend)

## License

MIT