/**
 * Anthropic list prices, USD per million tokens. Cache reads are billed at
 * 10% of input, cache writes at 125%. Update when the model or prices change;
 * the metered cost on the Expenses page is only as right as this table.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50 },
}

export type TokenUsage = {
  input: number
  output: number
  cacheRead?: number
  cacheWrite?: number
}

/** Cost in microdollars (1,000,000 = $1) so sub-cent calls add up exactly. */
export function costMicrodollars(model: string, u: TokenUsage): number {
  const p = MODEL_PRICES[model] ?? MODEL_PRICES["claude-opus-5-5"]
  const perTokenIn = p.input // $ per 1M tokens == microdollars per token
  const perTokenOut = p.output
  const cost =
    u.input * perTokenIn +
    u.output * perTokenOut +
    (u.cacheRead ?? 0) * perTokenIn * 0.1 +
    (u.cacheWrite ?? 0) * perTokenIn * 1.25
  return Math.round(cost)
}

export function microdollarsToCents(micro: number): number {
  return micro / 10_000
}
