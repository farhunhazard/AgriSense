// src/components/ModelDetails.jsx
import React from "react";
import { ethers } from "ethers";
import PredictModel from "./PredictModel";

const CATEGORY_LABEL = {
  yield: "Yield Prediction",
  soil: "Soil Health",
  pest: "Pest Detection",
  weather: "Weather Forecast",
  other: "Other",
  general: "General",
};

export default function ModelDetails({ model, open, onClose, gateway }) {
  if (!open || !model) return null;

  const priceEth = model.price
    ? (() => {
        try {
          return ethers.formatEther(model.price).toString();
        } catch {
          return (model.price || "0").toString();
        }
      })()
    : "0";

  const fallbackImage = "/placeholder.png";
  const imgUrl = model.cid ? `${gateway}${model.cid}` : fallbackImage;

  const categoryLabel = model.category
    ? CATEGORY_LABEL[model.category] || model.category
    : "AI Model";

  // model.modelSummary expected shape (from server / train step):
  // { n_rows, n_features, target_col, metrics: { r2, rmse, mae, avg_confidence } }
  const modelSummary = model.modelSummary || null;
  const metrics = modelSummary?.metrics || null;

  // backend base
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const datasetUrl = `${BACKEND}/download-dataset`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div
        className="relative max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-[#061011] rounded-2xl
                   border border-[#00ff95]/30 shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-6 z-70"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          {/* Left: Image */}
          <div className="w-full md:w-1/2 flex-shrink-0">
            <img
              src={imgUrl}
              alt={model.name || model.id}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackImage;
              }}
              className="w-full h-72 md:h-96 object-cover rounded-lg"
            />
          </div>

          {/* Right: Info + Actions */}
          <div className="flex-1 pl-0 md:pl-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              {model.name || model.id}
            </h2>
            <p className="text-sm md:text-base text-gray-300 mt-2">{categoryLabel} • AI Model</p>

            <div className="mt-6 space-y-3 text-gray-200 text-sm md:text-base">
              <div>
                <span className="text-gray-400">Provider:</span>{" "}
                <span className="text-[#5cff7a]">{model.provider}</span>
              </div>
              <div>
                <span className="text-gray-400">CID:</span>{" "}
                <span className="break-all">{model.cid || "-"}</span>
              </div>
              <div>
                <span className="text-gray-400">Price:</span>{" "}
                <span className="text-white font-semibold">
                  {priceEth === "0.0" ? "Free" : `${priceEth} QIE`}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Active:</span>{" "}
                <span className="text-white">{model.active ? "Yes" : "No"}</span>
              </div>

              {model.txHash && (
                <div className="mt-1 text-sm md:text-base text-gray-300">
                  <span className="text-gray-400">Tx:</span>{" "}
                  <a
                    href={`${import.meta.env.VITE_EXPLORER_BASE || "https://testnet.qie.digital"}/tx/${model.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#00ff95] text-sm md:text-base"
                  >
                    {model.txHash.slice(0, 10)}...{model.txHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={model.cid ? `${gateway}${model.cid}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-md bg-[#00ff95] text-black font-semibold hover:bg-[#5cff7a] transition text-sm md:text-base"
              >
                Open IPFS
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-[#00ff95]/30 text-white text-sm md:text-base"
              >
                Close
              </button>

              {/* Keep dataset download link here (as you preferred) */}
              <a
                href={datasetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-md border border-[#00ff95]/20 text-[#00ff95] text-sm md:text-base"
              >
                Download dataset
              </a>
            </div>
          </div>
        </div>

        {/* Prediction area */}
        <div className="mt-6 border-t border-white/10 pt-6" id="predict-section">
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">Run Prediction</h3>
          <p className="text-sm md:text-base text-gray-300 mb-4">
            Run the model on your input. Predictions can be minted as NFTs (if enabled).
          </p>

          <div className="bg-[#081212] p-4 rounded-lg border border-[#00ff95]/10">
            <PredictModel model={model} />
          </div>
        </div>

        {/* Training metrics (if available on model) */}
        {metrics && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <h4 className="text-lg md:text-xl font-semibold text-white mb-3">Model training summary</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#051212] rounded border border-[#00ff95]/6">
                <div className="text-xs text-gray-400">Rows</div>
                <div className="text-xl font-bold text-white">{modelSummary?.n_rows ?? "-"}</div>
              </div>

              <div className="p-3 bg-[#051212] rounded border border-[#00ff95]/6">
                <div className="text-xs text-gray-400">Features</div>
                <div className="text-xl font-bold text-white">{modelSummary?.n_features ?? "-"}</div>
              </div>

              <div className="p-3 bg-[#051212] rounded border border-[#00ff95]/6">
                <div className="text-xs text-gray-400">Target</div>
                <div className="text-xl font-bold text-white">{modelSummary?.target_col ?? "-"}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#041414] rounded border border-[#00ff95]/8">
                <div className="text-xs text-gray-400">R²</div>
                <div className="text-lg font-semibold text-[#5cff7a]">{(metrics.r2 ?? "N/A")}</div>
              </div>

              <div className="p-3 bg-[#041414] rounded border border-[#00ff95]/8">
                <div className="text-xs text-gray-400">RMSE</div>
                <div className="text-lg font-semibold text-[#5cff7a]">{metrics.rmse ?? "N/A"}</div>
              </div>

              <div className="p-3 bg-[#041414] rounded border border-[#00ff95]/8">
                <div className="text-xs text-gray-400">MAE</div>
                <div className="text-lg font-semibold text-[#5cff7a]">{metrics.mae ?? "N/A"}</div>
              </div>
            </div>

            {typeof metrics.avg_confidence !== "undefined" && (
              <div className="mt-4 text-sm text-gray-300">
                <span className="text-gray-400">Average predicted confidence (train):</span>{" "}
                <span className="font-bold text-[#5cff7a]">{Math.round(metrics.avg_confidence * 100) / 100}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
