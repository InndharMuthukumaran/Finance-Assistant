import { queryKnowledgeBase } from '../utils/ragBridge.js';

export const knowledgeSchema = {
  name: "lookup_financial_knowledge",
  description: "Search the local personal finance knowledge base to retrieve rules of thumb, guidelines, definitions, and expert advice (e.g. budgeting rules, emergency fund sizing, investment types).",
  input_schema: {
    type: "object",
    properties: {
      query: { 
        type: "string", 
        description: "The semantic search query (e.g. '50/30/20 rule explained', 'how much to save in emergency fund')" 
      },
      top_k: {
        type: "number",
        description: "Number of relevant facts to retrieve (default: 2)"
      }
    },
    required: ["query"]
  }
};

export async function lookupFinancialKnowledge({ query, top_k = 2 }) {
  try {
    const results = await queryKnowledgeBase(query, top_k);
    return {
      success: true,
      query: query,
      facts: results.map(r => ({
        confidence: r.score.toFixed(4),
        text: r.text
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
