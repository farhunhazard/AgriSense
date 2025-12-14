// src/components/Header.jsx
import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import WalletModal from "./WalletModal";

export default function Header() {
  const { connectWallet, disconnectWallet, account } = useWeb3();

  const [showWalletModal, setShowWalletModal] = useState(false);

  // Smooth scrolling navigation
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleWalletSelect = (walletName) => {
    setShowWalletModal(false);
    connectWallet(walletName);
  };

  return (
    <>
      <header
        className="
          w-full fixed top-0 left-0 z-50 
          px-12 py-5 
          flex justify-between items-center
          bg-gradient-to-r from-[rgba(0,40,20,0.55)]
          via-[rgba(0,15,10,0.65)]
          to-[rgba(0,40,20,0.55)]
          backdrop-blur-xl
          border-b border-[#00ff95]/40
          shadow-[0_4px_25px_rgba(0,255,150,0.15)]
        "
      >
        {/* LOGO → Scroll to Home */}
        <h1
          className="
            text-3xl font-extrabold 
            text-[#5cff7a] tracking-wide 
            drop-shadow-[0_0_12px_#00ff95]
            cursor-pointer
          "
          onClick={() => scrollToSection("home-section")}
        >
          AgriSense 🌾
        </h1>

        {/* NAVIGATION */}
        <nav className="flex gap-12 text-lg items-center text-gray-200">

          <button
            onClick={() => scrollToSection("home-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            Home
          </button>

          <button
            onClick={() => scrollToSection("register-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            Register Model
          </button>

          <button
            onClick={() => scrollToSection("explore-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            Explore Models
          </button>

          <button
            onClick={() => scrollToSection("agribot-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            AgriBot
          </button>

          <button
            onClick={() => scrollToSection("agriinsights-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            Agri Insights
          </button>

          <button
            onClick={() => scrollToSection("contacts-section")}
            className="hover:text-[#00ff95] underline underline-offset-8 decoration-[#00ff95] transition-all"
          >
            Contacts
          </button>

          {/* WALLET STATUS */}
          {account ? (
            <div className="flex items-center gap-4">

              <span
                className="
                  px-6 py-2 rounded-xl font-semibold
                  bg-[#00ff95]/20 text-[#00ff95]
                  border border-[#00ff95]/50
                  shadow-[0_0_15px_#00ff95]
                  backdrop-blur-md
                "
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>

              <button
                onClick={disconnectWallet}
                className="
                  px-4 py-2 rounded-xl font-semibold
                  text-red-400 border border-red-500
                  hover:bg-red-500 hover:text-white
                  transition-all duration-300
                "
              >
                Disconnect
              </button>

            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="
                px-6 py-2 rounded-xl font-semibold
                border border-[#00ff95]/60
                text-[#00ff95]
                hover:bg-[#00ff95] hover:text-black
                transition-all duration-300
                shadow-[0_0_15px_#00ff95]
                backdrop-blur-md
              "
            >
              Connect Wallet
            </button>
          )}
        </nav>
      </header>

      {/* WALLET MODAL */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={handleWalletSelect}
      />
    </>
  );
}
