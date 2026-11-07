import type { Plugin } from "./types";
import { simulateTradeAction } from "./actions/simulateTrade";
import { guardInputsAction } from "./actions/guardInputs";
import { createX402PaymentHeader } from "./x402Signer";

export * from "./types";
export * from "./actions/simulateTrade";
export * from "./actions/guardInputs";
export * from "./x402Signer";

export const kuroxSentinelPlugin: Plugin = {
  name: "kurox-sentinel",
  description: "Autonomous pre-trade DEX honeypot verification and prompt-injection defense plugin for ElizaOS agents on Base and Solana",
  actions: [simulateTradeAction, guardInputsAction],
  evaluators: [],
  providers: []
};

export default kuroxSentinelPlugin;
