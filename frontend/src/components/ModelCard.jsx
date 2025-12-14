// src/components/ModelCard.jsx
import React from "react";
import { ethers } from "ethers";

/**
 * ModelCard
 * Props:
 *  - model: { id, name, provider, price, category, categoryLabel, imageUrl, txHash }
 *  - gateway: optional image url fallback
 *  - onOpen: callback when "See Details" clicked
 *  - sectionTitle: optional string — if provided, renders a small heading above the card
 */
export default function ModelCard({ model = {}, gateway, onOpen, sectionTitle = null }) {
  // format price (best-effort)
  const priceEth = (() => {
    try {
      if (!model.price) return "0";
      // if it's already a readable string (not wei), try to format as ether
      return ethers.formatEther(model.price).toString();
    } catch {
      // fallback to raw value
      return (model.price || "0").toString();
    }
  })();

  const shortAddr = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "-");

  const imgUrl = gateway || model?.imageUrl || "/placeholder.png";

  const explorerBase = import.meta.env.VITE_EXPLORER_BASE || "https://testnet.qie.digital";

  return (
    <div>
      {/* optional section heading shown above the card */}
      {sectionTitle && (
        <div className="mb-2">
          <div className="text-sm text-gray-300 font-medium">{sectionTitle}</div>
        </div>
      )}

      <div
        className="group relative bg-[#071011] rounded-xl overflow-hidden border border-[#00ff95]/20
                   shadow-[0_10px_30px_rgba(0,255,150,0.06)] hover:scale-[1.02] transition-transform"
      >
        <div className="w-full h-56 bg-black/50 flex items-center justify-center">
          <img src={imgUrl} alt={model.name || "model"} className="w-full h-full object-cover" />
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-white truncate">{model.name || model.id}</h3>

          <p className="mt-1 text-xs text-gray-300">
            {model.categoryLabel || (model.category ? String(model.category).replace(/^\w/, (c) => c.toUpperCase()) : "GENERAL")}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <div>
                By{" "}
                <span className="text-[#5cff7a] font-medium">
                  {shortAddr(model.provider)}
                </span>
              </div>

              <div className="mt-1">
                {priceEth === "0.0" || priceEth === "0" ? "Free" : `${priceEth} QIE`}
              </div>

              {model.txHash && (
                <div className="mt-1 text-xs text-gray-400">
                  Tx:{" "}
                  <a
                    href={`${explorerBase}/tx/${model.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#00ff95]"
                  >
                    {model.txHash.slice(0, 8)}...{model.txHash.slice(-6)}
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => onOpen && onOpen(model)}
              className="px-3 py-1 rounded-md bg-transparent border border-[#00ff95]/30 text-[#00ff95] 
                         hover:bg-[#00ff95] hover:text-black transition"
            >
              See Details
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-[#00ff95]/6 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
