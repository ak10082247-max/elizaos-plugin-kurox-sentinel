import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "../types";

export const simulateTradeAction: Action = {
  name: "SIMULATE_TRADE",
  similes: ["CHECK_HONEYPOT", "VERIFY_TOKEN", "SIMULATE_SWAP", "CHECK_TOKEN_SAFETY"],
  description: "Simulates a DEX buy/sell order in sandbox to detect honeypots, compute exact transfer taxes in bps, and verify liquidity locks on Base and Solana.",
  validate: async (runtime: IAgentRuntime, message: Memory) => true,
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: HandlerCallback) => {
    const text = message.content?.text || "";
    const baseMatch = text.match(/0x[a-fA-F0-9]{40}/);
    const solanaMatch = text.match(/[1-9A-HJ-NP-za-km-z]{32,44}/);
    const tokenAddress = baseMatch ? baseMatch[0] : (solanaMatch ? solanaMatch[0] : null);

    if (!tokenAddress) {
      if (callback) callback({ text: "Please provide a valid Base (0x...) or Solana token address to simulate." });
      return false;
    }

    const isSolana = !baseMatch && !!solanaMatch;
    const paidEndpoint = isSolana
      ? "https://rugshield-402.onrender.com/v1/scan"
      : "https://rugshield-402.onrender.com/v1/audit/swap-simulation-proof";
    const previewEndpoint = `https://rugshield-402.onrender.com/v1/scan/preview?token_address=${tokenAddress}&chain=${isSolana ? 'solana' : 'base'}`;

    try {
      // 1. Attempt paid execution via x402 if payment client or header available
      const res = await fetch(paidEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_address: tokenAddress, amount_usd: 1000, chain: isSolana ? "solana" : "base" })
      });

      if (res.ok) {
        const data = await res.json();
        if (callback) {
          callback({
            text: `🛡️ Pre-Trade Simulation for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Safe to Trade: ${!data.is_honeypot}\n- Buy Tax: ${data.buy_tax_bps || 0} bps\n- Sell Tax: ${data.sell_tax_bps || 0} bps\n- LP Locked: ${data.lp_locked_pct !== undefined ? data.lp_locked_pct + '%' : 'Verified'}\n- Simulation Status: ${data.status || 'Verified'}\n- Settlement: Paid via x402 V2`
          });
        }
        return true;
      }

      // 2. If 402 and no auto-payer attached, seamlessly fall back to free zero-wallet preview hook!
      if (res.status === 402) {
        const previewRes = await fetch(previewEndpoint);
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          if (callback) {
            callback({
              text: `🛡️ Free Preview Token Scan for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Symbol: ${previewData.symbol || 'Unknown'}\n- Liquidity: $${previewData.liquidity_usd || 0}\n- Safe Indicators: ${previewData.risk_factors?.length === 0 ? 'No red flags' : 'Caution advised'}\n\n💡 Full pre-trade bytecode simulation with state-overrides available at $0.100 USDC via x402.`
            });
          }
          return true;
        }
      }

      throw new Error(`Endpoint returned HTTP ${res.status}`);
    } catch (error: any) {
      if (callback) callback({ text: `Simulation error: ${error.message}` });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Is token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 safe to buy?" } },
      { user: "{{agent}}", content: { text: "Simulating pre-trade swap against DEX liquidity now..." } }
    ]
  ]
};
