# @kurox/elizaos-plugin-sentinel

> Pre-trade DEX honeypot verification and prompt injection defense plugin for **ElizaOS** agents on **Base** and **Solana**.

---

## ⚡ What it Does

1. **`SIMULATE_TRADE`**: Runs pre-trade state-override simulation against live DEX pools (Aerodrome, Uniswap V3, Raydium, Pump.fun) before the agent executes a swap. Catches honeypots, verifies LP locks, and returns exact transfer taxes in bps.
2. **`GUARD_INPUTS`**: Neutralizes zero-width unicode smuggling, role-hijacking tokens (`[INST]`, `<|im_start|>`), and jailbreak attempts from untrusted external text (tweets, Discord messages, scraper results) before context ingestion.

---

## 🚀 Installation

```bash
npm install @kurox/elizaos-plugin-sentinel
```

Or add locally to your Eliza project:
```typescript
import { kuroxSentinelPlugin } from "@kurox/elizaos-plugin-sentinel";

export const character: Character = {
  name: "DeFi Autonomous Trader",
  plugins: [
    kuroxSentinelPlugin
  ],
  // ...
};
```

---

## 💡 How It Works Under the Hood
Each simulation or input guard call routes to Kurox's dual-chain infrastructure:
- **Honeypot Simulation**: `https://rugshield-402.onrender.com/v1/audit/swap-simulation-proof` ($0.100 USDC)
- **Input Sanitization**: `https://canaryguard-402.onrender.com/v1/sanitize` ($0.015 USDC)

Settled gaslessly via x402 V2 EIP-3009 on Base (`0x80E0Ae84679b7f11bE171DaADd492FBECf628cd6`) or SPL Token transfer on Solana (`DD3A7jaXFeHcif9eYj6Vhomuxypat5Yxi8ow6wxz27yL`).

---

## License
MIT
