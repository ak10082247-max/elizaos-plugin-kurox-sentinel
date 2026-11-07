export interface X402PaymentConfig {
    privateKey: string;
    targetUrl: string;
    amountMicroUnits: string;
    merchantRecipient?: string;
    chainId?: number;
    usdcAddress?: string;
}
export declare function createX402PaymentHeader(options: X402PaymentConfig): Promise<string>;
