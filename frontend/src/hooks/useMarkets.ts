"use client";

import { useState, useCallback, useEffect } from "react";
import { PREDICTION_MARKET_ADDRESS } from "@/lib/contract";
import { getResolvedMarketMeta, loadRemoteMarketMeta } from "@/lib/markets";
import { Market } from "@/lib/types";

type MarketSnapshot = {
  id: number;
  deadline: string;
  resolved: boolean;
  outcome: boolean;
  totalYes: string;
  totalNo: string;
};

type MarketsResponse = {
  markets?: MarketSnapshot[];
  error?: string;
  details?: string;
};

function toUiMarket(snapshot: MarketSnapshot): Market {
  const totalYes = Number(BigInt(snapshot.totalYes)) / 1_000_000;
  const totalNo = Number(BigInt(snapshot.totalNo)) / 1_000_000;
  const totalStake = totalYes + totalNo;
  const yesPercentage =
    totalStake === 0 ? 50 : Math.round((totalYes / totalStake) * 100);
  const deadline = Number(BigInt(snapshot.deadline)) * 1000;
  const meta = getResolvedMarketMeta(snapshot.id);

  return {
    id: String(snapshot.id),
    category: meta.category,
    question: meta.question,
    deadline,
    yesPercentage,
    noPercentage: 100 - yesPercentage,
    totalStake,
    participants: Math.round(totalStake),
    contractAddress: PREDICTION_MARKET_ADDRESS,
    resolveDescription: snapshot.resolved
      ? `Market resolved with outcome ${snapshot.outcome ? "YES" : "NO"}.`
      : "Admin will verify the answer after the deadline.",
    status: snapshot.resolved
      ? "resolved"
      : Date.now() >= deadline
        ? "expired"
        : "active",
  };
}

type UseMarketsOptions = {
  status?: "active" | "closed" | "all";
};

export function useMarkets(options: UseMarketsOptions = {}) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const statusFilter = options.status ?? "active";

  useEffect(() => {
    let cancelled = false;

    async function loadMarkets() {
      await loadRemoteMarketMeta().catch(console.error);

      const response = await fetch("/api/markets", { cache: "no-store" });
      const data = (await response.json()) as MarketsResponse;

      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Failed to load markets");
      }

      const nextMarkets = (data.markets ?? [])
        .map(toUiMarket)
        .filter(
          (market) =>
            statusFilter === "all" ||
            (statusFilter === "active" && market.status === "active") ||
            (statusFilter === "closed" && market.status !== "active"),
        );

      if (!cancelled) {
        setMarkets(nextMarkets);
        setCurrentIndex((index) => Math.min(index, nextMarkets.length));
      }
    }

    loadMarkets().catch(console.error);
    const interval = window.setInterval(() => {
      loadMarkets().catch(console.error);
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [statusFilter]);

  const currentMarket = markets[currentIndex] || null;
  const nextMarket = markets[currentIndex + 1] || null;
  const remainingCount = markets.length - currentIndex;

  const advanceToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, markets.length));
  }, [markets.length]);

  const hasMore = currentIndex < markets.length;

  return {
    markets,
    currentMarket,
    nextMarket,
    currentIndex,
    remainingCount,
    advanceToNext,
    hasMore,
  };
}
