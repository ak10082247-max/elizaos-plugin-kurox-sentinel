import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "../types";
import { createX402PaymentHeader } from "../x402Signer";

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
    const amountMicroUnits = isSolana ? "10000" : "100000";
    const previewEndpoint = `https://rugshield-402.onrender.com/v1/scan/preview?token_address=${tokenAddress}&chain=${isSolana ? 'solana' : 'base'}`;

    // Detect private key for autonomous gasless x402 payment
    let privateKey: string | undefined;
    try {
      if (typeof runtime?.getSetting === "function") {
        privateKey = runtime.getSetting("EVM_PRIVATE_KEY") ||
                     runtime.getSetting("WALLET_PRIVATE_KEY") ||
                     runtime.getSetting("PRIVATE_KEY");
      }
    } catch {}
    if (!privateKey && typeof process !== "undefined" && process.env) {
      privateKey = process.env.EVM_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
    }

    // 1. If wallet key configured, execute paid simulation via x402 gasless EIP-712
    if (privateKey) {
      try {
        const paymentHeader = await createX402PaymentHeader({
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
          const safeToTrade = data.is_honeypot === false
            ? "true"
            : data.is_honeypot === true
              ? "false (HONEYPOT)"
              : "Unverified";
          let receiptTx = data.tx_hash || "settled";
          try {
            const prHeader = res.headers.get("PAYMENT-RESPONSE");
            if (prHeader) {
              const decoded = JSON.parse(Buffer.from(prHeader, "base64").toString("utf8"));
              if (decoded?.transaction) receiptTx = decoded.transaction;
            }
          } catch {}
          if (callback) {
            callback({
              text: `🛡️ Pre-Trade Simulation for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Safe to Trade: ${safeToTrade}\n- Buy Tax: ${typeof data.buy_tax_bps === 'number' ? data.buy_tax_bps + ' bps' : 'Unverified'}\n- Sell Tax: ${typeof data.sell_tax_bps === 'number' ? data.sell_tax_bps + ' bps' : 'Unverified'}\n- LP Locked: ${typeof data.lp_locked_pct === 'number' ? data.lp_locked_pct + '%' : 'Unverified'}\n- Simulation Status: ${data.simulation_status ?? 'unverified'}\n- Settlement: Settled via x402 V2 (${receiptTx})`
            });
          }
          return true;
        }
      } catch (payErr: any) {
        console.warn("[kurox-sentinel] Paid simulation failed, falling back to preview:", payErr.message);
      }
    }

    // 2. Fallback to free zero-wallet preview hook
    try {
      const previewRes = await fetch(previewEndpoint);
      if (previewRes.ok) {
        const previewData = await previewRes.json();
        const riskList = Array.isArray(previewData.risk_flags)
          ? previewData.risk_flags
          : Array.isArray(previewData.risk_factors)
            ? previewData.risk_factors
            : null;
        if (callback) {
          callback({
            text: `🛡️ Free Preview Token Scan for ${tokenAddress} (${isSolana ? 'Solana' : 'Base'}):\n- Symbol: ${previewData.symbol || 'Unknown'}\n- Liquidity: ${typeof previewData.liquidity_usd === 'number' ? '$' + previewData.liquidity_usd.toLocaleString() : 'Unknown'}\n- Honeypot Check: ${typeof previewData.is_honeypot === 'boolean' ? String(previewData.is_honeypot) : 'Unsimulated (preview only)'}\n- Risk Indicators: ${riskList ? (riskList.length ? riskList.join(', ') : 'None flagged in preview') : 'Unverified'}\n\n💡 For full DEX swap simulation (buy/sell taxes and honeypot verification), configure EVM_PRIVATE_KEY ($0.100 USDC on Base / $0.010 USDC Solana scan via x402).`
          });
        }
        return true;
      }
      throw new Error(`Preview returned HTTP ${previewRes.status}`);
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
