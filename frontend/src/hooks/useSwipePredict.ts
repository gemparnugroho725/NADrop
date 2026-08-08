"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { stake } from "@/lib/api";
import { Market, Prediction, SwipeDirection, SettlementState } from "@/lib/types";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function marketIdToNumber(id: string) {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useSwipePredict() {
  const { address } = useWallet();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [activeSwipe, setActiveSwipe] = useState<{
    market: Market;
    direction: SwipeDirection;
  } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [settlementState, setSettlementState] = useState<SettlementState>({
    phase: "idle",
    txHash: null,
    settlementTime: null,
    error: null,
  });

  const onSwipe = useCallback(
    (market: Market, direction: SwipeDirection) => {
      if (direction === "up") {
        setSettlementState({
          phase: "idle",
          txHash: null,
          settlementTime: null,
          error: null,
        });
        return;
      }

      setActiveSwipe({ market, direction });
      setShowOverlay(true);

      void (async () => {
        const startedAt = performance.now();
        const choice = direction === "right" ? "YA" : "TIDAK";

        try {
          if (market.status !== "active") {
            throw new Error("Market is closed. Swipe up to skip.");
          }

          if (!address) {
            throw new Error("Log in before staking");
          }

          setSettlementState({
            phase: "sending",
            txHash: null,
            settlementTime: null,
            error: null,
          });
          await wait(120);
          setSettlementState((state) => ({ ...state, phase: "facilitator" }));
          await wait(120);
          setSettlementState((state) => ({ ...state, phase: "verified" }));

          const result = await stake({
            marketId: marketIdToNumber(market.id),
            side: direction === "right",
            userAddress: address,
          });

          if (result.error || !result.txHash) {
            throw new Error(result.error ?? "Stake failed");
          }

          const settlementTime =
            Math.round(((performance.now() - startedAt) / 1000) * 10) / 10;

          setSettlementState({
            phase: "settled",
            txHash: result.txHash,
            settlementTime,
            error: null,
          });

          const newPrediction: Prediction = {
            id: `pred-${Date.now()}`,
            marketId: market.id,
            question: market.question,
            choice,
            stake: 1,
            status: "pending",
            payout: null,
            txHash: result.txHash,
            settledAt: Date.now(),
            settlementTime,
          };

          setPredictions((prev) => [newPrediction, ...prev]);
        } catch (error) {
          setSettlementState({
            phase: "error",
            txHash: null,
            settlementTime: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    },
    [address],
  );

  const dismissOverlay = useCallback(() => {
    setShowOverlay(false);
    setActiveSwipe(null);
    setSettlementState({
      phase: "idle",
      txHash: null,
      settlementTime: null,
      error: null,
    });
  }, []);

  return {
    predictions,
    activeSwipe,
    showOverlay,
    settlementState,
    onSwipe,
    dismissOverlay,
  };
}
