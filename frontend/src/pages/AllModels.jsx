// src/pages/AllModels.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";
import { motion } from "framer-motion";

export default function AllModels() {
  const { fetchModels } = useWeb3();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await fetchModels();
      setModels(list);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-green-800 mb-6">AI Models Marketplace</h1>

        {loading ? (
          <p className="text-lg">Loading models…</p>
        ) : models.length === 0 ? (
          <p className="text-lg">No models registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((m) => (
              <Link to={`/model/${encodeURIComponent(m.id)}`} key={m.id} className="transform hover:-translate-y-2 transition-shadow">
                <div className={`p-5 rounded-2xl shadow-lg bg-white/90 backdrop-blur-md border border-green-100`}>
                  <h3 className="text-2xl font-semibold text-green-800">{m.name || String(m.id)}</h3>
                  <p className="text-sm text-gray-600 mt-2">Provider: {m.provider}</p>
                  <p className="text-sm text-gray-600">CID: <span className="break-all">{m.cid}</span></p>
                  <p className="mt-3 font-semibold text-green-700">
                    Price: {m.price ? ethers.formatEther(m.price) : "0"} QIE
                  </p>
                  <p className={`mt-2 text-sm ${m.active ? "text-green-600" : "text-red-600"}`}>{m.active ? "Active" : "Inactive"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
