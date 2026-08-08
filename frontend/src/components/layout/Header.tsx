"use client";

import { WalletChip, NetworkBadge } from "@/components/shared/WalletChip";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-base)]/95 backdrop-blur-sm border-b border-[var(--color-chrome-border)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          {/* Logo / Brand */}
          <h1 className="text-lg font-bold font-display text-[var(--color-ink)] tracking-tight">
            Swipe<span className="text-[var(--color-yes)]">Predict</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <NetworkBadge />
          <WalletChip />
        </div>
      </div>
    </header>
  );
}
