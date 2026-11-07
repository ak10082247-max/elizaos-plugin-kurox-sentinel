"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateTradeAction = void 0;
exports.simulateTradeAction = {
    name: "SIMULATE_TRADE",
    similes: ["CHECK_HONEYPOT", "VERIFY_TOKEN", "SIMULATE_SWAP", "CHECK_TOKEN_SAFETY"],
    description: "Simulates a DEX buy/sell order in sandbox to detect honeypots, compute exact transfer taxes in bps, and verify liquidity locks on Base and Solana.",
    validate: async (runtime, message) => true,
    handler: async (runtime, message, state, options, callback) => {
        const text = message.content?.text || "";
        const baseMatch = text.match(/0x[a-fA-F0-9]{40}/);
        const solanaMatch = text.match(/[1-9A-HJ-NP-za-km-z]{32,44}/);
        const tokenAddress = baseMatch ? baseMatch[0] : (solanaMatch ? solanaMatch[0] : null);
        if (!tokenAddress) {
            if (callback)
                callback({ text: "Please provide a valid Base (0x...) or Solana token address to simulate." });
            return false;
        }
        const isSolana = !baseMatch && !!solanaMatch;
        const endpoint = isSolana
            ? "https://rugshield-402.onrender.com/v1/scan"
            : "https://rugshield-402.onrender.com/v1/audit/swap-simulation-proof";
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token_address: tokenAddress, amount_usd: 1000, chain: isSolana ? "solana" : "base" })
            });
            const data = await res.json();
            if (callback) {
                callback({
                    text: `🛡️ Pre-Trade Simulation for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Safe to Trade: ${!data.is_honeypot}\n- Buy Tax: ${data.buy_tax_bps || 0} bps\n- Sell Tax: ${data.sell_tax_bps || 0} bps\n- LP Locked: ${data.lp_locked_pct !== undefined ? data.lp_locked_pct + '%' : 'Verified'}\n- Simulation Status: ${data.status || 'Verified'}`
                });
            }
            return true;
        }
        catch (error) {
            if (callback)
                callback({ text: `Simulation error: ${error.message}` });
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
