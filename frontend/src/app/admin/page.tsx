"use client";

import { FormEvent, useEffect, useState } from "react";
import { NetworkBadge, WalletChip } from "@/components/shared/WalletChip";
import {
  getResolvedMarketMeta,
  saveMarketMeta,
} from "@/lib/markets";

const explorerTxUrl = "https://testnet.monadvision.com/tx/";
const marketListLimit = 8;

type Status = {
  text: string;
  txHash?: string;
  error?: string;
};

type MarketRow = {
  id: number;
  question: string;
  category: string;
  totalYes: string;
  totalNo: string;
  resolved: boolean;
  outcome: boolean;
  deadline?: number;
};

function Countdown({ deadline }: { deadline: number }) {
  const [timeLeft, setTimeLeft] = useState(deadline - Date.now());

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(deadline - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, timeLeft]);

  if (timeLeft <= 0) {
    return <span className="text-[var(--color-yes)]">Ready to Resolve</span>;
  }

  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return <span className="text-[var(--color-live)] font-bold">Ends in {m}m {s}s</span>;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

function bodyError(response: Response, body: Record<string, unknown>) {
  const message =
    typeof body.details === "string"
      ? body.details
      : typeof body.error === "string"
        ? body.error
        : JSON.stringify(body);

  return `HTTP ${response.status} ${response.statusText}: ${message}`;
}

export default function AdminPage() {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [status, setStatus] = useState<Status>({ text: "idle" });
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [minutes, setMinutes] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    const response = await fetch("/api/admin-markets", { cache: "no-store" });
    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(bodyError(response, body));
    }

    setRows((body.markets ?? []) as MarketRow[]);
  }

  useEffect(() => {
    refresh().catch((error) => {
      setStatus({
        text: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, []);

  async function createMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ text: "creating market" });

    try {
      const deadline = Math.floor(Date.now() / 1000) + minutes * 60;
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
        },
        body: JSON.stringify({ deadline }),
      });
      const body = await readJson(response);

      if (!response.ok) {
        setStatus({ text: "error", error: bodyError(response, body) });
        return;
      }

      const marketId = Number(body.marketId);
      const meta = {
        question: question.trim() || `Market #${marketId}`,
        category: category.trim() || "General",
      };
      await saveMarketMeta(marketId, meta).catch(console.error);

      setQuestion("");
      setRows((current) => [
        {
          id: marketId,
          question: meta.question,
          category: meta.category,
          totalYes: "0",
          totalNo: "0",
          resolved: false,
          outcome: false,
          deadline: deadline * 1000,
        },
        ...current,
      ]);
      setStatus({
        text: `market #${marketId} created`,
        txHash: String(body.txHash),
      });
    } catch (error) {
      setStatus({
        text: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resolveMarket(marketId: number, outcome: boolean) {
    setIsSubmitting(true);
    setStatus({
      text: outcome ? `resolve #${marketId} YES` : `resolve #${marketId} NO`,
    });

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
        },
        body: JSON.stringify({ marketId, outcome }),
      });
      const body = await readJson(response);

      if (!response.ok) {
        setStatus({ text: "error", error: bodyError(response, body) });
        return;
      }

      setStatus({
        text: `market #${marketId} resolved`,
        txHash: String(body.txHash),
      });
      setRows((current) =>
        current.map((row) =>
          row.id === marketId
            ? {
                ...row,
                resolved: true,
                outcome,
              }
            : row,
        ),
      );
    } catch (error) {
      setStatus({
        text: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col px-4 md:px-6 pt-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-1">
            Admin
          </h1>
          <p className="text-sm text-[var(--color-chrome)]">
            Verify market outcomes and add new market questions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NetworkBadge />
          <WalletChip />
        </div>
      </div>

      <section className="mb-4 rounded-[var(--radius-card)] border border-[var(--color-chrome-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-stack)] font-data text-sm">
        <div>Status: {status.text}</div>
        {status.txHash ? (
          <a
            href={`${explorerTxUrl}${status.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[var(--color-yes)] underline"
          >
            {status.txHash}
          </a>
        ) : null}
        {status.error ? (
          <pre className="mt-3 whitespace-pre-wrap break-words text-[var(--color-no)]">
            {status.error}
          </pre>
        ) : null}
      </section>

      <form
        onSubmit={createMarket}
        className="mb-6 grid gap-3 rounded-[var(--radius-card)] border border-[var(--color-chrome-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-stack)]"
      >
        <h2 className="font-data text-sm uppercase tracking-wider text-[var(--color-chrome)]">
          Add Question
        </h2>
        <label className="grid gap-1">
          <span className="font-data text-xs text-[var(--color-chrome)]">
            Question
          </span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="rounded-[var(--radius-chip)] border border-[var(--color-chrome-border)] bg-[var(--color-base)] px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            placeholder="Will MON go up in the next hour?"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-data text-xs text-[var(--color-chrome)]">
              Category
            </span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-[var(--radius-chip)] border border-[var(--color-chrome-border)] bg-[var(--color-base)] px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-data text-xs text-[var(--color-chrome)]">
            Duration minutes
            </span>
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="rounded-[var(--radius-chip)] border border-[var(--color-chrome-border)] bg-[var(--color-base)] px-3 py-2 font-data outline-none focus:border-[var(--color-ink)]"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[var(--radius-button)] bg-[var(--color-ink)] px-4 py-3 font-semibold text-[var(--color-base)] disabled:opacity-50"
        >
          Create market
        </button>
      </form>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-data text-sm uppercase tracking-wider text-[var(--color-chrome)]">
            Market List
          </h2>
          <button
            type="button"
            onClick={() => refresh().catch((error) => {
              setStatus({
                text: "error",
                error: error instanceof Error ? error.message : String(error),
              });
            })}
            disabled={isSubmitting}
            className="rounded-[var(--radius-button)] border border-[var(--color-chrome-border)] px-3 py-2 font-data text-xs text-[var(--color-chrome)] disabled:opacity-50"
          >
            Manual refresh
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-6 text-center font-data text-xs text-[var(--color-chrome)] shadow-[var(--shadow-stack)]">
            Empty. New markets will appear after creation.
          </div>
        ) : null}
        {rows.slice(0, marketListLimit).map((market) => {
          const meta = getResolvedMarketMeta(market.id);

          return (
            <article
              key={market.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-chrome-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-stack)]"
            >
              <div className="mb-2 flex flex-wrap justify-between gap-3 font-data text-xs text-[var(--color-chrome)]">
                <span>
                  [{market.category || meta.category}] market #{market.id}
                </span>
                <span>
                  {market.resolved
                    ? `resolved: ${market.outcome ? "YES" : "NO"}`
                    : market.deadline ? <Countdown deadline={market.deadline} /> : "waiting for verification"}
                </span>
              </div>
              <h3 className="mb-4 font-display text-xl font-bold text-[var(--color-ink)]">
                {market.question || meta.question}
              </h3>
              <div className="mb-4 grid gap-2 font-data text-sm sm:grid-cols-2">
                <div className="rounded-[var(--radius-chip)] border border-[var(--color-yes-mid)] bg-[var(--color-yes-light)] p-3 text-[var(--color-yes)]">
                  YES pool: {market.totalYes} mUSDC
                </div>
                <div className="rounded-[var(--radius-chip)] border border-[var(--color-no-mid)] bg-[var(--color-no-light)] p-3 text-[var(--color-no)]">
                  NO pool: {market.totalNo} mUSDC
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => resolveMarket(market.id, true)}
                  disabled={isSubmitting || market.resolved}
                  className="rounded-[var(--radius-button)] border border-[var(--color-yes-mid)] px-4 py-2 font-data text-sm text-[var(--color-yes)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify answer: YES
                </button>
                <button
                  type="button"
                  onClick={() => resolveMarket(market.id, false)}
                  disabled={isSubmitting || market.resolved}
                  className="rounded-[var(--radius-button)] border border-[var(--color-no-mid)] px-4 py-2 font-data text-sm text-[var(--color-no)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify answer: NO
                </button>
              </div>
              <div className="mt-3 font-data text-xs text-[var(--color-chrome)]">
                {market.resolved
                  ? "This market has already been verified and cannot be verified again."
                  : "If TooEarly appears, the on-chain deadline has not passed yet."}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
