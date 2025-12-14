// src/components/ExploreModels.jsx
import React, { useEffect, useState } from "react";
import ModelCard from "./ModelCard";
import ModelDetails from "./ModelDetails";
import { useWeb3 } from "../context/Web3Context";

const FALLBACK_IMAGE_PATH = "/placeholder.png";

const CATEGORY_LABEL = {
  yield: "Yield Prediction",
  soil: "Soil Health",
  pest: "Pest Detection",
  weather: "Weather Forecast",
  other: "Other",
  general: "General",
};

export default function ExploreModels() {
  const { fetchModels, readRpcStatus, models: ctxModels } = useWeb3();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const envGateway = import.meta.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  const gatewayBase = envGateway.endsWith("/") ? envGateway : envGateway + "/";

  function fixCID(cid) {
    if (!cid) return null;
    cid = cid.trim();
    if (cid.length >= 90) {
      const half = Math.floor(cid.length / 2);
      const first = cid.slice(0, half);
      const second = cid.slice(half);
      if (first === second) return first;
    }
    if (cid.startsWith("ipfs/")) cid = cid.replace("ipfs/", "");
    if (cid.includes("mypinata.cloud") || cid.includes("gateway.pinata.cloud")) {
      const parts = cid.split("/ipfs/");
      if (parts.length > 1) cid = parts[1];
      else {
        const chunks = cid.split("/");
        cid = chunks[chunks.length - 1];
      }
    }
    return cid;
  }

  const toUiModel = (m) => {
    const cleanCid = fixCID(m.cid);
    return {
      id: m.id,
      name: m.name || "Unnamed Model",
      provider: m.provider,
      price: m.price,
      active: m.active,
      category: m.category || "general",
      categoryLabel: CATEGORY_LABEL[m.category] || CATEGORY_LABEL.general,
      cid: cleanCid,
      imageUrl: cleanCid ? gatewayBase + cleanCid : FALLBACK_IMAGE_PATH,
      txHash: m.txHash || null,
    };
  };

  // Merge incoming ctxModels into local UI models (by id) instead of replacing them
  useEffect(() => {
    if (!Array.isArray(ctxModels)) {
      // nothing to do — keep previous UI models
      return;
    }

    if (ctxModels.length === 0) {
      // Context cleared or not loaded: do not clear UI (keep stable)
      console.log("ExploreModels: ctxModels empty — keeping previous UI models");
      return;
    }

    // Convert context models to UI shape
    const incoming = ctxModels.map(toUiModel);

    // Build a map of existing models by id for easy merge
    const existingMap = new Map(models.map((m) => [String(m.id), m]));

    // Merge: for each incoming model, replace or add; preserve older ones not in incoming
    for (const inc of incoming) {
      existingMap.set(String(inc.id), {
        // prefer incoming values, but merge fields to avoid losing local-only values
        ...(existingMap.get(String(inc.id)) || {}),
        ...inc,
      });
    }

    // Create array in deterministic order:
    // - keep existing models order first (but updated),
    // - append any new incoming models not present originally (to preserve ordering)
    const merged = [];
    const seen = new Set();

    // First push existing state order (updated from map)
    for (const m of models) {
      const id = String(m.id);
      const up = existingMap.get(id);
      if (up) {
        merged.push(up);
        seen.add(id);
      }
    }

    // Then add any incoming models not yet included
    for (const inc of incoming) {
      const id = String(inc.id);
      if (!seen.has(id)) {
        merged.push(existingMap.get(id));
        seen.add(id);
      }
    }

    // If merged is empty (e.g., initial load), fallback to incoming
    const finalList = merged.length > 0 ? merged : incoming;

    setModels(finalList);
    setLastFetchAt(new Date());
  }, [ctxModels]); // eslint-disable-line react-hooks/exhaustive-deps

  // initial fetch on mount (non-destructive)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        await fetchModels(); // fetchModels should populate context models; merging handled above
        if (mounted) setLastFetchAt(new Date());
      } catch (err) {
        console.error("ExploreModels load err:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [fetchModels]);

  return (
    <section id="explore-section" className="w-full px-6 pt-12 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Explore Models</h2>
            <p className="text-sm text-gray-300">Browse AI models uploaded by providers on QIE</p>
          </div>

          <div className="text-xs text-gray-300 text-right">
            <div>RPC: <span className="font-medium">{readRpcStatus?.url || "—"}</span></div>
            <div>
              Status:{" "}
              {readRpcStatus?.ok ? (
                <span className="text-emerald-400">OK (blk {readRpcStatus.block})</span>
              ) : (
                <span className="text-yellow-300">No readProvider available (RPC down)</span>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {lastFetchAt ? `Last fetch: ${lastFetchAt.toLocaleTimeString()}` : "Not fetched yet"}
            </div>
          </div>
        </div>

        {/* Main grid of all models */}
        {loading ? (
          <div className="text-center text-gray-300 py-20">Loading models…</div>
        ) : models.length === 0 ? (
          <div className="text-center text-gray-400 py-20">No models found yet. Register one to see it appear here.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((m) => (
              <ModelCard
                key={String(m.id)}
                model={m}
                gateway={m.imageUrl}
                onOpen={() => {
                  setSelected(m);
                  setDetailsOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ModelDetails model={selected} open={detailsOpen} onClose={() => setDetailsOpen(false)} gateway={gatewayBase} />
      <div className="w-full border-t border-white/100 mt-10"></div>
    </section>
  );
}
