import { NextResponse } from "next/server";
import { formatUnits } from "viem";
import { readMarketMetadataMap } from "@/lib/server/marketMetadata";
import { readMarketSnapshotMap } from "@/lib/server/marketSnapshots";
import { readStakeRecords } from "@/lib/server/localDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatAmount(amount: bigint) {
  return formatUnits(amount, 6);
}

export async function GET() {
  try {
    const [records, metadataMap, marketMap] = await Promise.all([
      readStakeRecords(),
      readMarketMetadataMap(),
      readMarketSnapshotMap(),
    ]);
    const grouped = new Map<
      number,
      {
        id: number;
        question: string;
        category: string;
        totalYes: bigint;
        totalNo: bigint;
        resolved: boolean;
        outcome: boolean;
        deadline: number;
      }
    >();

    for (const record of records) {
      const meta = metadataMap[record.marketId] ?? {
        question: `Market #${record.marketId}`,
        category: "General",
      };
      const snapshot = marketMap.get(record.marketId);
      const row =
        grouped.get(record.marketId) ??
        {
          id: record.marketId,
          question: meta.question,
          category: meta.category,
          totalYes: BigInt(0),
          totalNo: BigInt(0),
          resolved: snapshot?.resolved ?? false,
          outcome: snapshot?.outcome ?? false,
          deadline: Number(snapshot?.deadline ?? 0) * 1000,
        };

      if (record.side) {
        row.totalYes += record.amount;
      } else {
        row.totalNo += record.amount;
      }

      grouped.set(record.marketId, row);
    }

    return NextResponse.json({
      markets: Array.from(grouped.values())
        .sort((a, b) => b.id - a.id)
        .map((market) => ({
          ...market,
          totalYes: formatAmount(market.totalYes),
          totalNo: formatAmount(market.totalNo),
        })),
    });
  } catch (error) {
    console.error("Read admin markets failed", error);

    return NextResponse.json(
      { error: "Read admin markets failed", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
