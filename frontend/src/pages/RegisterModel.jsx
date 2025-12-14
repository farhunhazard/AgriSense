// src/components/RegisterModel.jsx
import { useState, useEffect, useRef } from "react";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";

/* toast helper same as before */
function createToast(text, type = "info") {
  const t = document.createElement("div");
  t.textContent = text;
  t.className = `
    fixed left-1/2 -translate-x-1/2 top-8 z-[99999]
    px-4 py-2 rounded-lg text-sm font-medium shadow-lg
    transition-opacity duration-300
    ${type === "error" ? "bg-red-600 text-white" : "bg-emerald-500 text-black"}
  `;
  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = "0"), 2500);
  setTimeout(() => t.remove(), 3000);
}

export default function RegisterModel() {
  const { contract, account, addLocalModel } = useWeb3();

  // form fields
  const [modelName, setModelName] = useState("");
  const [cid, setCid] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("yield");

  // upload
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");

  // ui
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // name check
  const [nameAvailable, setNameAvailable] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  const debounceRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const UPLOAD_ENDPOINT = `${BACKEND_URL}/upload`;

  const normalizeCid = (raw) => {
    if (!raw) return "";
    const match = raw.trim().match(/(?:ipfs:\/\/|https?:\/\/[^/]+\/ipfs\/)?([^/?#]+)/i);
    return match ? match[1] : raw.trim();
  };

  const isValidModelName = (name) => {
    const s = name.trim();
    if (s.length < 3 || s.length > 32) return false;
    return /^[a-zA-Z0-9 _-]+$/.test(s);
  };

  const uploadToPinata = async (file) => {
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("UPLOAD FAIL:", msg);
        throw new Error("Upload failed");
      }
      const data = await res.json();
      if (!data.cid) throw new Error("Invalid CID response");
      setCid(data.cid);
      createToast("Image uploaded to IPFS ✔", "success");
      return data.cid;
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      createToast("Failed to upload image", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  /* name availability check (unchanged) */
  useEffect(() => {
    setNameAvailable(null);
    if (!contract) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!modelName || !isValidModelName(modelName)) return;
    setCheckingName(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const id = ethers.encodeBytes32String(modelName.trim());
        const model = await contract.models(id);
        const ZERO = "0x0000000000000000000000000000000000000000";
        const exists = model?.provider && model.provider !== ZERO;
        setNameAvailable(!exists);
      } catch (err) {
        console.error("name-check:", err);
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 600);
  }, [modelName, contract]);

  useEffect(() => {
    if (!account) {
      setErrorMsg("");
      setTxHash("");
      setNameAvailable(null);
    }
  }, [account]);

  const registerModel = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setTxHash("");

    if (!account) return setErrorMsg("Please connect your wallet first.");
    if (!contract) return setErrorMsg("❌ Smart contract not connected!");
    if (!isValidModelName(modelName)) return setErrorMsg("Invalid model name — must be 3–32 characters.");
    if (!cid) return setErrorMsg("Please upload an image first!");

    let priceWei;
    try {
      priceWei = /^\d+$/.test(price.trim())
        ? BigInt(price.trim())
        : ethers.parseUnits(price.trim(), "ether");
    } catch {
      return setErrorMsg("Invalid price format.");
    }

    try {
      setLoading(true);
      const id = ethers.encodeBytes32String(modelName.trim());
      const existing = await contract.models(id);
      const ZERO = "0x0000000000000000000000000000000000000000";
      if (existing.provider !== ZERO) return setErrorMsg("⚠️ Model name already exists!");

      const cleanCid = normalizeCid(cid);

      const tx = await contract.registerModel(id, cleanCid, priceWei, category);
      createToast("Transaction submitted…", "info");
      await tx.wait();

      setTxHash(tx.hash);
      createToast("Model Registered Successfully 🎉", "success");

      // Build a UI model and add it locally so Explore updates instantly
      const uiModel = {
        id,
        name: modelName.trim(),
        cid: cleanCid,
        price: priceWei.toString(),
        provider: account,
        active: true,
        category,
        txHash: tx.hash,
      };
      if (typeof addLocalModel === "function") addLocalModel(uiModel);

      // reset form
      setModelName("");
      setCid("");
      setPrice("");
      setCategory("yield");
      setPreview("");
      setImageFile(null);
      setNameAvailable(null);
    } catch (err) {
      console.error("register:", err);
      if (err?.message?.includes("rejected")) setErrorMsg("⚠️ Transaction rejected by user.");
      else setErrorMsg("❌ Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="register-section" className="w-full px-6 pt-24 pb-28">
      <h2 className="text-4xl font-bold text-white text-center mb-10 underline underline-offset-[12px] decoration-[#00ff95]/60">
        Register Your Model (QIE Testnet)
      </h2>

      <div className="w-full max-w-3xl mx-auto bg-[#0d1110] p-10 rounded-2xl shadow-[0_0_25px_#00ff95] border border-[#00ff95]/40">
        {!account ? (
          <p className="text-red-500 text-center mb-4">Please connect your wallet first.</p>
        ) : !contract ? (
          <p className="text-red-500 text-center mb-4">❌ Smart contract not connected!</p>
        ) : null}

        {errorMsg && (
          <p className="text-red-400 bg-red-900/30 border border-red-700 p-3 rounded-lg mb-4">
            {errorMsg}
          </p>
        )}

        {txHash && (
          <p className="text-green-400 bg-green-900/20 p-3 rounded-lg mb-4">
            ✅ Model Registered!
            <br />
            <span className="text-gray-300">Tx:</span>{" "}
            <a
              href={`${import.meta.env.VITE_EXPLORER_BASE || "https://testnet.qie.digital"}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </p>
        )}

        {account && contract && (
          <form onSubmit={registerModel} className="flex flex-col gap-6">
            <div>
              <input
                type="text"
                value={modelName}
                onChange={(e) => {
                  setModelName(e.target.value);
                  setNameAvailable(null);
                }}
                placeholder="Model Name"
                className="p-4 rounded-xl bg-black/40 text-white border border-[#00ff95]/40 w-full"
              />
              {modelName && isValidModelName(modelName) && (
                <p className="mt-2 text-sm">
                  {checkingName ? (
                    <span className="text-yellow-300">⏳ Checking...</span>
                  ) : nameAvailable === true ? (
                    <span className="text-green-400">✔ Available</span>
                  ) : nameAvailable === false ? (
                    <span className="text-red-400">✘ Already Exists</span>
                  ) : null}
                </p>
              )}
            </div>

            <div className="bg-black/30 border border-[#00ff95]/40 p-4 rounded-xl">
              <label className="text-sm text-gray-300">Upload Image</label>

              {preview ? (
                <img src={preview} className="w-40 h-40 object-cover rounded-xl border border-[#00ff95]/40 mt-4" />
              ) : (
                <div className="mt-4 h-40 w-full border border-dashed border-[#00ff95]/20 rounded-xl flex items-center justify-center text-gray-400">
                  No preview
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <label
                  htmlFor="fileUpload"
                  className="cursor-pointer bg-[#00ff95] text-black px-5 py-3 rounded-xl font-semibold shadow-[0_0_20px_#00ff95] hover:bg-[#5cff7a] transition"
                >
                  {uploading ? "Uploading..." : "Choose File"}
                </label>
              </div>

              <input
                id="fileUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setImageFile(file);
                  setPreview(URL.createObjectURL(file));
                  await uploadToPinata(file);
                }}
              />
            </div>

            <input
              type="text"
              value={cid}
              readOnly
              placeholder="CID auto-filled after upload"
              className="p-4 rounded-xl bg-black/40 text-white border border-[#00ff95]/40"
            />

            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price in ETH or WEI"
              className="p-4 rounded-xl bg-black/40 text-white border border-[#00ff95]/40"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-4 rounded-xl bg-black/40 text-white border border-[#00ff95]/40"
            >
              <option value="yield">Yield Prediction</option>
              <option value="soil">Soil Health</option>
              <option value="pest">Pest Detection</option>
              <option value="weather">Weather Forecast</option>
              <option value="other">Other</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#00ff95] text-black text-xl py-4 rounded-xl font-bold shadow-[0_0_25px_#00ff95] hover:bg-[#5cff7a] transition"
            >
              {loading ? "Registering..." : "Register Model"}
            </button>
          </form>
        )}
      </div>

      <div className="w-full border-t border-white/100 mt-10"></div>
    </section>
  );
}
