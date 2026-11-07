import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "crypto";

export interface X402PaymentConfig {
  privateKey: string;
  targetUrl: string;
  amountMicroUnits: string;
  merchantRecipient?: string;
  chainId?: number;
  usdcAddress?: string;
}

export async function createX402PaymentHeader(options: X402PaymentConfig): Promise<string> {
  const rawKey = options.privateKey.trim();
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const userAddress = account.address;
  const merchantRecipient = (options.merchantRecipient || "0x80E0Ae84679b7f11bE171DaADd492FBECf628cd6") as `0x${string}`;
  const chainId = options.chainId || 8453;
  const usdcAddress = (options.usdcAddress || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as `0x${string}`;
  const amountMicro = options.amountMicroUnits;

  const nowSec = Math.floor(Date.now() / 1000);
  const validAfter = 0;
  const validBefore = nowSec + 3600; // 1 hour validity (server allows up to 24h)
  const nonce = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;

  const domain = {
    name: "USD Coin",
    version: "2",
    chainId: chainId,
    verifyingContract: usdcAddress,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: userAddress,
    to: merchantRecipient,
    value: BigInt(amountMicro),
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce: nonce,
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "TransferWithAuthorization",
    message,
  });

  const paymentSignatureObj = {
    x402Version: 2,
    resource: { url: options.targetUrl },
    accepted: {
      scheme: "exact",
      network: `eip155:${chainId}`,
      amount: amountMicro,
      asset: usdcAddress,
      payTo: merchantRecipient,
      maxTimeoutSeconds: 300,
      extra: { name: "USD Coin", version: "2" },
    },
    payload: {
      signature: signature,
      authorization: {
        from: userAddress,
        to: merchantRecipient,
        value: amountMicro,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: nonce,
      },
    },
  };

  return Buffer.from(JSON.stringify(paymentSignatureObj)).toString("base64");
}
