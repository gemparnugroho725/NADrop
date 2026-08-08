import { decodePaymentSignatureHeader } from "@x402/core/http";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import type { Network, PaymentPayload } from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { withX402 } from "@x402/next";
import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { saveStakeRecord } from "@/lib/server/localDb";

const PREDICTION_MARKET_ADDRESS =
  "0x9FC2595F6493b939Db9E9116273129d650A55f86" as const;
const MOCK_USDC_ADDRESS =
  "0xF380657785bb52732DDA31A3cf14c248645594E5" as const;
const STAKE_AMOUNT = BigInt(1_000_000);
const MOCK_USER_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const MONAD_NETWORK = "eip155:10143" as Network;
const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? "https://x402-facilitator.molandak.org";

const STAKE_FOR_ABI = {
  name: "stakeFor",
  type: "function",
  inputs: [
    { name: "user", type: "address" },
    { name: "marketId", type: "uint256" },
    { name: "side", type: "bool" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [],
  stateMutability: "nonpayable",
} as const;

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

type StakeBody = {
  marketId: number;
  side: boolean;
  userAddress?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isStakeBody(value: unknown): value is StakeBody {
  if (!value || typeof value !== "object") return false;

  const body = value as Record<string, unknown>;
  return typeof body.marketId === "number" && typeof body.side === "boolean";
}

function getBackendPrivateKey() {
  const privateKey = process.env.BACKEND_PRIVATE_KEY;

  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("Missing or invalid BACKEND_PRIVATE_KEY");
  }

  return privateKey as Hex;
}

function getAddressFromValue(value: unknown): Address | null {
  if (typeof value !== "string") return null;

  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

function extractUserAddress(paymentPayload: PaymentPayload): Address | null {
  const payload = paymentPayload.payload as Record<string, unknown>;

  return (
    getAddressFromValue((payload.authorization as Record<string, unknown>)?.from) ??
    getAddressFromValue((payload.permit2Authorization as Record<string, unknown>)?.owner) ??
    getAddressFromValue((payload.permit2Authorization as Record<string, unknown>)?.from) ??
    getAddressFromValue(
      (
        (payload.authorization as Record<string, unknown>)
          ?.permit2Authorization as Record<string, unknown>
      )?.owner,
    )
  );
}

function getUserAddressFromPayment(request: NextRequest) {
  const paymentHeader = request.headers.get("X-PAYMENT");
  if (!paymentHeader) {
    throw new Error("Missing X-PAYMENT header after x402 verification");
  }

  const paymentPayload = decodePaymentSignatureHeader(paymentHeader);
  const userAddress = extractUserAddress(paymentPayload);

  if (!userAddress) {
    throw new Error("Unable to extract user address from x402 payment proof");
  }

  return userAddress;
}

async function callStakeFor(userAddress: Address, marketId: number, side: boolean) {
  const account = privateKeyToAccount(getBackendPrivateKey());
  const transport = http(process.env.NEXT_PUBLIC_RPC_URL);
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport,
  });
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport,
  });

  const txHash = await walletClient.writeContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: [STAKE_FOR_ABI],
    functionName: "stakeFor",
    args: [userAddress, BigInt(marketId), side, STAKE_AMOUNT],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`Stake transaction reverted: ${txHash}`);
  }

  return txHash;
}

async function readStakeBody(request: NextRequest) {
  const body = await request.json();

  if (!isStakeBody(body)) {
    throw new Error("Invalid request body");
  }

  return body;
}

async function stakeHandler(body: StakeBody, userAddress: Address) {
  try {
    const txHash = await callStakeFor(userAddress, body.marketId, body.side);
    await saveStakeRecord({
      marketId: body.marketId,
      userAddress,
      side: body.side,
      amount: STAKE_AMOUNT,
      txHash,
      createdAt: Date.now(),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      txHash,
      userAddress,
    });
  } catch (error) {
    console.error("Stake failed", error);

    return NextResponse.json(
      { error: "Stake failed", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

async function mockPost(request: NextRequest) {
  console.log("MOCK MODE: skipping x402");

  try {
    const body = await readStakeBody(request);
    const userAddress = getAddressFromValue(body.userAddress) ?? getAddress(MOCK_USER_ADDRESS);

    return stakeHandler(body, userAddress);
  } catch (error) {
    console.error("Stake failed", error);

    return NextResponse.json(
      { error: "Stake failed", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});
const resourceServer = registerExactEvmScheme(
  new x402ResourceServer(facilitatorClient),
  {
    networks: [MONAD_NETWORK],
  },
);

async function paidPost(request: NextRequest) {
  try {
    const body = await readStakeBody(request);
    return stakeHandler(body, getUserAddressFromPayment(request));
  } catch (error) {
    console.error("Stake failed", error);

    return NextResponse.json(
      { error: "Stake failed", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export const POST =
  process.env.X402_MODE === "mock"
    ? mockPost
    : withX402<unknown>(
      paidPost,
      {
        accepts: {
          scheme: "exact",
          payTo: process.env.PAY_TO_ADDRESS ?? "",
          price: {
            amount: STAKE_AMOUNT.toString(),
            asset: MOCK_USDC_ADDRESS,
            extra: {
              name: "Mock USDC",
              version: "1",
              assetTransferMethod: "permit2",
              permit2Address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
              x402ExactPermit2Proxy:
                "0x402085c248EeA27D92E8b30b2C58ed07f9E20001",
            },
          },
          network: MONAD_NETWORK,
          maxTimeoutSeconds: 120,
        },
        description: "SwipePredict 1 mUSDC market stake",
        mimeType: "application/json",
        serviceName: "SwipePredict",
        unpaidResponseBody: () => ({
          contentType: "application/json",
          body: {
            error: "Payment Required",
            amount: STAKE_AMOUNT.toString(),
            currency: "USDC",
            network: "monad-testnet",
            facilitator: FACILITATOR_URL,
          },
        }),
      },
      resourceServer,
    );
