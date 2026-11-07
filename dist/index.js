"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kuroxSentinelPlugin = void 0;
const simulateTrade_1 = require("./actions/simulateTrade");
const guardInputs_1 = require("./actions/guardInputs");
__exportStar(require("./types"), exports);
__exportStar(require("./actions/simulateTrade"), exports);
__exportStar(require("./actions/guardInputs"), exports);
exports.kuroxSentinelPlugin = {
    name: "kurox-sentinel",
    description: "Autonomous pre-trade DEX honeypot verification and prompt-injection defense plugin for ElizaOS agents on Base and Solana",
    actions: [simulateTrade_1.simulateTradeAction, guardInputs_1.guardInputsAction],
    evaluators: [],
    providers: []
};
exports.default = exports.kuroxSentinelPlugin;
