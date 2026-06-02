import { logger } from '../utils/logger.js';

export const currencySchema = {
  name: "convert_currency",
  description: "Convert a monetary amount from one currency to another (e.g. USD, EUR, GBP, INR) using live exchange rates.",
  input_schema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "The amount to convert" },
      from: { type: "string", description: "The 3-letter source currency code (e.g., USD)" },
      to: { type: "string", description: "The 3-letter target currency code (e.g., INR)" }
    },
    required: ["amount", "from", "to"]
  }
};

// Standard static exchange rates dictionary (using USD as baseline) for offline fallback
const FALLBACK_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.3,
  JPY: 156.0,
  CAD: 1.37,
  AUD: 1.51
};

async function fetchRates(fromCurrency) {
  try {
    logger.debug(`[Currency] Fetching live rates for ${fromCurrency} from open.er-api.com`);
    const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency.toUpperCase()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.result === 'success' && data.rates) {
      return data.rates;
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    logger.warn(`[Currency] Failed to fetch live exchange rates: ${error.message}. Using offline fallback.`);
    
    const fromUpper = fromCurrency.toUpperCase();
    if (!FALLBACK_RATES[fromUpper]) {
      throw new Error(`Unsupported fallback currency: ${fromUpper}`);
    }

    // Convert the USD fallback list to be relative to fromCurrency
    const relativeRates = {};
    const baseInUsd = 1 / FALLBACK_RATES[fromUpper];
    for (const [code, val] of Object.entries(FALLBACK_RATES)) {
      relativeRates[code] = val * baseInUsd;
    }
    
    return relativeRates;
  }
}

export async function convertCurrency({ amount, from, to }) {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    return { amount, from: fromUpper, to: toUpper, convertedAmount: amount, rate: 1.0 };
  }

  const rates = await fetchRates(fromUpper);
  const rate = rates[toUpper];

  if (!rate) {
    throw new Error(`Unsupported target currency code: ${toUpper}`);
  }

  const convertedAmount = amount * rate;
  return {
    amount,
    from: fromUpper,
    to: toUpper,
    convertedAmount: parseFloat(convertedAmount.toFixed(4)),
    rate: parseFloat(rate.toFixed(6))
  };
}
