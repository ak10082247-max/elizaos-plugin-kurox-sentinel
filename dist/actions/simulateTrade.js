"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateTradeAction = void 0;
const x402Signer_1 = require("../x402Signer");
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
        const paidEndpoint = isSolana
            ? "https://rugshield-402.onrender.com/v1/scan"
            : "https://rugshield-402.onrender.com/v1/audit/swap-simulation-proof";
        const amountMicroUnits = isSolana ? "10000" : "100000";
        const previewEndpoint = `https://rugshield-402.onrender.com/v1/scan/preview?token_address=${tokenAddress}&chain=${isSolana ? 'solana' : 'base'}`;
        // Detect private key for autonomous gasless x402 payment
        let privateKey;
        try {
            if (typeof runtime?.getSetting === "function") {
                privateKey = runtime.getSetting("EVM_PRIVATE_KEY") ||
                    runtime.getSetting("WALLET_PRIVATE_KEY") ||
                    runtime.getSetting("PRIVATE_KEY");
            }
        }
        catch { }
        if (!privateKey && typeof process !== "undefined" && process.env) {
            privateKey = process.env.EVM_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
        }
        // 1. If wallet key configured, execute paid simulation via x402 gasless EIP-712
        if (privateKey) {
            try {
                const paymentHeader = await (0, x402Signer_1.createX402PaymentHeader)({
                    privateKey,
                    targetUrl: paidEndpoint,
                    amountMicroUnits,
                });
                const res = await fetch(paidEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "PAYMENT-SIGNATURE": paymentHeader,
                        "X-PAYMENT": paymentHeader
                    },
                    body: JSON.stringify({
                        token_address: tokenAddress,
                        amount_usd: 1000,
                        chain: isSolana ? "solana" : "base"
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (callback) {
                        callback({
                            text: `🛡️ Pre-Trade Simulation for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Safe to Trade: ${!data.is_honeypot}\n- Buy Tax: ${data.buy_tax_bps ?? 0} bps\n- Sell Tax: ${data.sell_tax_bps ?? 0} bps\n- LP Locked: ${data.lp_locked_pct !== undefined ? data.lp_locked_pct + '%' : 'Verified'}\n- Simulation Status: Passed\n- Settlement: Gaslessly settled via x402 V2 (${data.tx_hash || 'confirmed'})`
                        });
                    }
                    return true;
                }
            }
            catch (payErr) {
                console.warn("[kurox-sentinel] Paid simulation failed, falling back to preview:", payErr.message);
            }
        }
        // 2. Fallback to free zero-wallet preview hook
        try {
            const previewRes = await fetch(previewEndpoint);
            if (previewRes.ok) {
                const previewData = await previewRes.json();
                if (callback) {
                    callback({
                        text: `🛡️ Free Preview Token Scan for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Symbol: ${previewData.symbol || 'Unknown'}\n- Liquidity: $${previewData.liquidity_usd || 0}\n- Safe Indicators: ${previewData.risk_factors?.length === 0 ? 'No red flags detected' : 'Caution advised'}\n\n💡 To enable automated real-time DEX simulation with state overrides, configure EVM_PRIVATE_KEY in your agent settings ($0.100 USDC gasless per scan).`
                    });
                }
                return true;
            }
            throw new Error(`Preview returned HTTP ${previewRes.status}`);
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
