// src/components/WalletModal.jsx
import React from "react";
import { X } from "lucide-react";

export default function WalletModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const wallets = [
    { name: "WalletConnect", icon: "/walletconnect.png", tag: "QR CODE" },
    { name: "MetaMask", icon: "/metamask.png", tag: "INSTALLED" },
    { name: "QIE Wallet", icon: "/Qie_logo.png", tag: "INSTALLED" },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999]">
      <div
        className="
          w-[430px]
          bg-[#0d1110]
          rounded-2xl
          shadow-[0_0_25px_#00ff95]
          border border-[#00ff95]/40
          p-6 
          overflow-hidden
        "
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[#00ff95]">Connect Wallet</h2>

          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* WALLET LIST BOX FIX */}
        <div
          className="
            space-y-4
            rounded-xl
            overflow-hidden
            bg-[#0b130f]
            p-3
          "
        >
          {wallets.map((wallet, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(wallet.name)}
              className="
                w-full p-4 rounded-lg
                flex items-center justify-between
                bg-[#0e1613] hover:bg-[#113a26]
                border border-[#00ff95]/20
                transition shadow-md
              "
            >
              <div className="flex items-center gap-3">
                <img src={wallet.icon} className="w-10 h-10" />
                <span className="text-lg text-white">{wallet.name}</span>
              </div>

              <span className="text-xs px-3 py-1 rounded-full bg-[#00ff95]/20 text-[#00ff95]">
                {wallet.tag}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
