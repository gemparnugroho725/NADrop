<div align="center">
  <img src="https://via.placeholder.com/150x150?text=NADrop+Logo" alt="NADrop Logo" width="150" height="150" />
  
  # 🎯 NADrop

  **Prediction Markets as Fast as Swiping.**
  
  [![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
  [![Monad](https://img.shields.io/badge/Network-Monad_Testnet-blueviolet)](https://monad.xyz)
  [![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)](https://nadrop.netlify.app)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  [Live Demo](https://nadrop.netlify.app) • [Documentation](#) • [Smart Contracts](#)

</div>

---

## 🚀 What is NADrop?

**NADrop** is a lightning-fast, gamified prediction market platform built exclusively for the high-performance **Monad Testnet**. Designed to remove the friction and complexity of traditional DeFi trading, NADrop introduces a Tinder-like swiping mechanic to crypto predictions: 

👉 **Swipe Right for YES** <br/>
👈 **Swipe Left for NO** <br/>
👆 **Swipe Up to SKIP**

By combining a playful **Hand-Drawn & Analog Skeuomorphic** aesthetic with the blazingly fast execution of Monad and the instant on-chain settlement of the **x402 protocol**, NADrop makes predicting real-world events as casual, engaging, and frictionless as a mobile game.

---

## ✨ Key Features

- **🔥 Tinder-Style Swiping UI:** Predict outcomes effortlessly. No complex trading charts or order books—just read the market card and swipe to stake your position.
- **🎨 Whimsical & Hand-Drawn Aesthetic:** Breaking away from dark, corporate "cyberpunk" SaaS trends. NADrop features a refreshing analog design with wobbly lines, parchment textures, and organic ink colors.
- **⚡ Instant On-Chain Settlement:** Powered by the x402 protocol, market resolutions and payouts are settled on-chain in less than a second, with zero manual claiming friction.
- **🛡️ Frictionless Onboarding:** Integrated with **Privy**, users can seamlessly log in using just their email or connect directly via MetaMask. No seed phrases required for newcomers.
- **🌐 Monad Ecosystem Native:** Built to take full advantage of Monad's parallel execution, delivering a lag-free, highly responsive prediction experience.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React 19, TailwindCSS v4
- **Web3 Auth:** Privy (`@privy-io/react-auth`)
- **Blockchain / Smart Contracts:** Monad Testnet, Viem, x402 Protocol
- **Backend / Database:** Supabase (Public Market Data), Next.js Serverless API Routes
- **Hosting:** Netlify (Edge-optimized)

---

## 💻 Local Development

Follow these steps to run the NADrop frontend locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v20 or higher recommended)
- `npm` or `yarn` or `pnpm`
- A [Privy](https://privy.io) App ID
- A [Supabase](https://supabase.com) Project

### 1. Clone the repository
```bash
git clone https://github.com/gemparnugroho725/NADrop.git
cd NADrop/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the `frontend` directory and add your keys:
```env
# Privy Auth
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Monad RPC
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz/
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the app running.

---

## 🚀 Deployment (Netlify)

This project is configured to be easily deployed on **Netlify**. A `netlify.toml` is included in the root directory for automatic Next.js routing configuration.

1. Connect your GitHub repository to Netlify.
2. Ensure the **Base directory** is set to `frontend`.
3. Set the **Build command** to `npm run build`.
4. Add all your `.env.local` environment variables to Netlify's Environment Variables settings.
5. Click **Deploy**.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <i>Built for the Monad Ecosystem 💜</i>
</div>
