"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import type { Chain } from "viem";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
  ready: boolean;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
  connect: () => { },
  disconnect: () => { },
  ready: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
} as const satisfies Chain;

function WalletContextProvider({ children }: { children: ReactNode }) {
  const { authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? null;

  const connect = useCallback(() => {
    void login();
  }, [login]);

  const disconnect = useCallback(() => {
    void logout();
  }, [logout]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: authenticated && Boolean(address),
        address,
        connect,
        disconnect,
        ready,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!appId || appId.includes("...")) {
    return (
      <div className="p-6 font-data text-sm text-[var(--color-ink)]">
        Missing NEXT_PUBLIC_PRIVY_APP_ID
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#0E9F6E",
          landingHeader: "Login ke SwipePredict",
          loginMessage: "Pakai email Privy atau MetaMask.",
          walletList: ["detected_ethereum_wallets"],
          walletChainType: "ethereum-only",
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        externalWallets: {
          disableAllExternalWallets: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <WalletContextProvider>{children}</WalletContextProvider>
    </PrivyProvider>
  );
}
