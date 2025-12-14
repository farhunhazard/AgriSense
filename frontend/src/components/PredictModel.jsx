// src/components/PredictModel.jsx
import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";

/**
 * PredictModel (UI fixes + IPFS metadata image handling)
 *
 * - Restores dark AI result background so text is visible.
 * - Attempts to fetch IPFS content for resultCid:
 *    - If content is image -> show directly
 *    - If content is JSON metadata and has `image` field -> resolve ipfs:// -> gateway and show
 *    - Fallback: use model.cid (the model's image CID shown under provider/CID)
 * - Mint flow: opens MetaMask to send mint payment (10,000,000 wei) to model.provider, waits for confirmation,
 *   sends backend mint POST and shows server mint tx + on-chain payment tx.
 */

export default function PredictModel({ model }) {
  const { provider, account } = useWeb3();
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [resultCid, setResultCid] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [minting, setMinting] = useState(false);
  const [mintPaymentTx, setMintPaymentTx] = useState(null);
  const [mintServerTx, setMintServerTx] = useState(null);
  const [mintedImageUrl, setMintedImageUrl] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);

  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const EXPLORER = import.meta.env.VITE_EXPLORER_BASE || "https://testnet.qie.digital";

  // get signer
  const getActiveSigner = async () => {
    try {
      if (provider && typeof provider.getSigner === "function") {
        const s = await provider.getSigner();
        if (typeof s.sendTransaction === "function") return s;
      }
    } catch (e) {}
    if (typeof window !== "undefined" && window.ethereum) {
      const eth = window.ethereum;
      const providers = eth.providers || [eth];
      const mm = providers.find((p) => p.isMetaMask) || providers[0];
      try {
        const wrapped = new ethers.BrowserProvider(mm);
        const s = await wrapped.getSigner();
        if (typeof s.sendTransaction === "function") return s;
      } catch (e) {}
    }
    return null;
  };

  // helper to resolve ipfs:// -> gateway url
  const resolveIpfsToGateway = (maybeIpfs) => {
    if (!maybeIpfs) return null;
    if (typeof maybeIpfs !== "string") return null;
    // ipfs://Qm... or /ipfs/Qm...
    if (maybeIpfs.startsWith("ipfs://")) {
      const cidPath = maybeIpfs.replace("ipfs://", "");
      return `https://gateway.pinata.cloud/ipfs/${cidPath}`;
    }
    if (maybeIpfs.startsWith("/ipfs/")) {
      return `https://gateway.pinata.cloud${maybeIpfs}`;
    }
    // otherwise assume it's already a URL
    if (/^https?:\/\//i.test(maybeIpfs)) return maybeIpfs;
    // else fallback to gateway treating as cid/path
    return `https://gateway.pinata.cloud/ipfs/${maybeIpfs}`;
  };

  // when resultCid changes, attempt to fetch it and derive image URL if possible
  useEffect(() => {
    let cancelled = false;
    async function fetchIpfsContent() {
      setMintedImageUrl(null);
      if (!resultCid) return;
      try {
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${resultCid}`;
        const resp = await fetch(gatewayUrl);
        if (!resp.ok) {
          // maybe CORS or not found — still set image url to gateway; browser may show it if it's an image
          if (!cancelled) setMintedImageUrl(gatewayUrl);
          return;
        }
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const json = await resp.json();
          const imageField = json.image || json.image_url || json.imageURI || json.img;
          if (imageField) {
            const resolved = resolveIpfsToGateway(imageField);
            if (!cancelled) setMintedImageUrl(resolved);
            return;
          } else {
            // JSON but no image field; nothing to preview (fallback below)
            if (!cancelled) setMintedImageUrl(null);
            return;
          }
        } else if (ct.startsWith("image/")) {
          // direct image bytes
          if (!cancelled) setMintedImageUrl(gatewayUrl);
          return;
        } else {
          // unknown content-type: still try using gateway as image source
          if (!cancelled) setMintedImageUrl(gatewayUrl);
        }
      } catch (e) {
        // network/CORS error: still set gateway as best-effort URL
        if (resultCid && !cancelled) setMintedImageUrl(`https://gateway.pinata.cloud/ipfs/${resultCid}`);
      }
    }
    fetchIpfsContent();
    return () => {
      cancelled = true;
    };
  }, [resultCid]);

  // If mintedImageUrl still null and model.cid exists, use that as a fallback image source (but only if a result exists OR after mint)
  useEffect(() => {
    if (!mintedImageUrl && result && model?.cid) {
      const resolved = resolveIpfsToGateway(model.cid);
      setMintedImageUrl(resolved);
    }
    // we intentionally don't add model to deps to avoid changing unexpectedly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // runPrediction: sends a small payment via MetaMask before calling /predict (as you requested)
  const runPrediction = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setResult(null);
    setResultCid(null);
    setModelMetrics(null);
    setMintPaymentTx(null);
    setMintServerTx(null);
    setMintedImageUrl(null);
    setRunning(true);

    if (!inputText || inputText.trim().length < 10) {
      setErrorMsg("Please describe your crop in the input box for the best analysis.");
      setRunning(false);
      return;
    }
    if (!account) {
      setErrorMsg("Please connect your wallet.");
      setRunning(false);
      return;
    }

    try {
      const signer = await getActiveSigner();
      if (!signer) {
        setErrorMsg("Wallet provider does not support sending transactions. Use MetaMask or a wallet that supports txs.");
        setRunning(false);
        return;
      }

      const toAddress = model?.provider;
      if (!toAddress) {
        setErrorMsg("Model provider address not configured; cannot request payment for prediction.");
        setRunning(false);
        return;
      }

      // small payment for runPrediction (you used 1,000,000 earlier)
      const smallPayment = 1000000n;
      setInfoMsg("Opening wallet to confirm small prediction payment...");
      const tx = await signer.sendTransaction({ to: toAddress, value: smallPayment });
      setInfoMsg("Waiting for 1 confirmation for prediction payment...");
      const receipt = await tx.wait(1);
      const paymentTxHash = receipt?.transactionHash || tx.hash;
      setInfoMsg("Payment confirmed. Calling prediction endpoint...");

      // call backend /predict with paymentTx included
      let resp;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("prompt", inputText);
        form.append("modelCid", model.cid || "");
        form.append("paymentTx", paymentTxHash);
        resp = await fetch(`${BACKEND}/predict`, { method: "POST", body: form });
      } else {
        resp = await fetch(`${BACKEND}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: inputText, modelCid: model.cid || "", paymentTx: paymentTxHash }),
        });
      }

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        try {
          const parsed = JSON.parse(txt || "{}");
          if (parsed && parsed.error) throw new Error(parsed.error);
        } catch (e) {}
        throw new Error(txt || "Prediction request failed");
      }

      const json = await resp.json();
      setResult(json.result || null);
      setResultCid(json.cid || null);
      setInfoMsg("Prediction completed successfully.");

      // pick training metrics from server result (or /metrics fallback)
      if (json.result?.trainingMetrics) {
        setModelMetrics(json.result.trainingMetrics);
      } else if (json.result?.modelSummary?.metrics) {
        setModelMetrics(json.result.modelSummary.metrics);
      } else {
        try {
          const mresp = await fetch(`${BACKEND}/metrics`);
          if (mresp.ok) {
            const mj = await mresp.json();
            if (mj?.metrics) setModelMetrics(mj.metrics);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.toLowerCase().includes("user denied") || msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("cancel")) {
        setErrorMsg("Wallet transaction cancelled by user.");
      } else {
        setErrorMsg("Prediction failed. See console for details.");
        console.error("runPrediction error (details):", err);
      }
    } finally {
      setRunning(false);
    }
  };

  // mintAsNFT: uses MetaMask to send 10,000,000 wei to provider then POSTs to backend /mint
  const mintAsNFT = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!resultCid) {
      setErrorMsg("No prediction available to mint. Run prediction first.");
      return;
    }
    if (!account) {
      setErrorMsg("Connect your wallet before minting.");
      return;
    }

    const signer = await getActiveSigner();
    if (!signer) {
      setErrorMsg("No signer available (MetaMask / injected wallet).");
      return;
    }

    const toAddress = model?.provider;
    if (!toAddress) {
      setErrorMsg("Model provider address not configured — cannot send mint payment.");
      return;
    }

    setMinting(true);
    try {
      setInfoMsg("Opening wallet for mint payment (10,000,000 wei)...");
      const paymentValue = 10000000n;
      const tx = await signer.sendTransaction({ to: toAddress, value: paymentValue });

      setInfoMsg("Waiting for mint payment confirmation (1 confirmation)...");
      const receipt = await tx.wait(1);
      const paymentTxHash = receipt?.transactionHash || tx.hash;
      setMintPaymentTx(paymentTxHash);

      setInfoMsg("Payment confirmed. Notifying backend to mint...");
      const mintResp = await fetch(`${BACKEND}/mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: account,
          tokenURI: `ipfs://${resultCid}`,
          modelId: model?.id,
          paymentTx: paymentTxHash,
        }),
      });

      if (!mintResp.ok) {
        const txt = await mintResp.text().catch(() => "");
        try {
          const parsed = JSON.parse(txt || "{}");
          if (parsed && parsed.error) throw new Error(parsed.error);
        } catch (e) {}
        throw new Error(txt || "Mint endpoint failed");
      }

      const mintBody = await mintResp.json();
      const serverMintTx = mintBody.txHash || mintBody.tx || mintBody.transactionHash || null;
      const tokenId = mintBody.tokenId ?? mintBody.token_id ?? null;
      setMintServerTx(serverMintTx);
      setInfoMsg("Mint successful.");

      // Attempt to display minted image:
      // 1) resultCid -> effect will try to fetch metadata & image
      // 2) fallback to model.cid (model image CID)
      if (resultCid) {
        // effect hooked to resultCid will fetch and set mintedImageUrl
        // ensure we give it a moment (setResultCid already set by runPrediction)
      } else if (model?.cid) {
        setMintedImageUrl(resolveIpfsToGateway(model.cid));
      }

      // attach mint details into result state so UI can show them
      setResult((r) => ({
        ...(r || {}),
        mintTx: serverMintTx,
        paymentTx: paymentTxHash,
        tokenId,
      }));
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.toLowerCase().includes("user denied") || msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("cancel")) {
        setErrorMsg("Payment cancelled by user in wallet.");
      } else {
        setErrorMsg(`Mint failed: ${msg}`);
      }
      console.error("mintAsNFT error:", err);
    } finally {
      setMinting(false);
    }
  };

  // downloadReportPdf (unchanged)
  const downloadReportPdf = async () => {
    if (!result) {
      setErrorMsg("No prediction result to download. Run a prediction first.");
      return;
    }
    try {
      setInfoMsg("Preparing PDF...");
      const resp = await fetch(`${BACKEND}/download-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || "Could not generate PDF");
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agrisense_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setInfoMsg("PDF downloaded.");
    } catch (e) {
      setErrorMsg("Could not download PDF. See console.");
      console.error("downloadReportPdf error:", e);
    }
  };

  // derived UI values
  const aiText = result?.prediction?.text || result?.text || null;
  const displayedConfidence = (result?.prediction?.confidence ?? modelMetrics?.avg_confidence ?? "N/A");
  const displayedAccuracy =
    result?.modelAccuracy ?? (modelMetrics && typeof modelMetrics.r2 !== "undefined" ? `${(Math.round((modelMetrics.r2 ?? 0) * 10000) / 100)}% (R²)` : "N/A");

  return (
    <div className="p-4 bg-[#071011] rounded-lg border border-[#00ff95]/20">
      <style>{`
        .ai-content { color: #dfffe6; }
        .ai-paragraph { margin-bottom: 8px; }
        .ai-section { font-weight: 700; margin-top:10px; margin-bottom:6px; }
        .ai-section-h3 { font-size: 18px; color: #ffffff; }
        .ai-section-h4 { font-size: 15px; color: #bfffd6; }
        .ai-ul { margin: 6px 0 6px 18px; padding: 0; }
        .ai-li { margin-bottom: 6px; color: #dfffe6; }
        .ai-strong { color: #a8ffbf; font-weight:700; }
        .ai-key { color: #5cff7a; font-weight:700; }
      `}</style>

      <h3 className="text-xl font-bold text-white mb-3">Run Prediction</h3>

      <label className="text-sm text-gray-300 mb-1 block">Describe your crop / input for the model</label>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Describe the field, stage, problems ... E.g. 'Wheat, 50 days since sowing, moderate irrigation, signs of yellowing on lower leaves'"
        className="w-full p-3 rounded-md bg-[#071a16] text-[#00ff95] border border-[#00ff95]/20 mb-3"
        rows={4}
      />

      <label className="text-sm text-gray-400 mb-2 block">Image (optional — will default to model registered image if omitted)</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <div className="mt-4 flex gap-3 items-center">
        <button onClick={runPrediction} disabled={running} className="px-4 py-2 rounded-md bg-[#00ff95] text-black font-semibold">
          {running ? "Running…" : `Run Prediction`}
        </button>

        {resultCid ? (
          <button onClick={mintAsNFT} disabled={minting} className="px-4 py-2 rounded-md border border-[#00ff95] text-[#00ff95]">
            {minting ? "Minting… (check wallet)" : "Mint Prediction as NFT "}
          </button>
        ) : null}
      </div>

      {infoMsg && <div className="mt-3 text-green-400">{infoMsg}</div>}
      {errorMsg && <div className="mt-3 text-red-400">{errorMsg}</div>}

      <div className="mt-4">
        {/* Payment tx (if present in result) */}
        {result?.paymentTx && (
          <div className="text-sm text-gray-300 mb-2">
            Payment Tx:{" "}
            <a href={`${EXPLORER}/tx/${result.paymentTx}`} target="_blank" rel="noreferrer" className="underline text-[#5cff7a]">
              {String(result.paymentTx).slice(0, 10)}...{String(result.paymentTx).slice(-8)}
            </a>
          </div>
        )}

        {mintPaymentTx && (
          <div className="text-sm text-gray-300 mb-1">
            On-chain payment (MetaMask) Tx:{" "}
            <a href={`${EXPLORER}/tx/${mintPaymentTx}`} target="_blank" rel="noreferrer" className="underline text-[#5cff7a]">
              {mintPaymentTx}
            </a>
          </div>
        )}
        {mintServerTx && (
          <div className="text-sm text-gray-300 mb-2">
            Mint Tx (server):{" "}
            <a href={`${EXPLORER}/tx/${mintServerTx}`} target="_blank" rel="noreferrer" className="underline text-[#5cff7a]">
              {mintServerTx}
            </a>
          </div>
        )}

        <div className="flex items-center gap-6 mb-3">
          <div className="text-sm text-gray-300">
            Model confidence:{" "}
            <span className="font-bold text-[#5cff7a]">{displayedConfidence !== null ? `${displayedConfidence}/100` : "N/A"}</span>
          </div>
          <div className="text-sm text-gray-300">
            Model accuracy:{" "}
            <span className="font-bold text-[#5cff7a]">{displayedAccuracy ?? "N/A"}</span>
          </div>
        </div>

        {modelMetrics && (
          <div className="mb-4 text-sm text-gray-300">
            <div><strong className="text-gray-400">R² :</strong> <span className="text-[#5cff7a]">{modelMetrics.r2 ?? "N/A"}</span></div>
            <div><strong className="text-gray-400">RMSE :</strong> <span className="text-[#5cff7a]">{modelMetrics.rmse ?? "N/A"}</span></div>
            <div><strong className="text-gray-400">MAE :</strong> <span className="text-[#5cff7a]">{modelMetrics.mae ?? "N/A"}</span></div>
            <div><strong className="text-gray-400">avg_confidence :</strong> <span className="text-[#5cff7a]">{modelMetrics.avg_confidence ?? "N/A"}</span></div>
          </div>
        )}

        {/* AI result box: restored dark bg so content is visible */}
        <div className="bg-[#00110e] border border-[#00ff95]/10 rounded-md p-3 text-sm text-[#dfffe6] max-h-56 overflow-y-auto" style={{ fontSize: "14px", lineHeight: "1.6" }}>
          {aiText ? <div dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(aiText) }} /> : <div className="text-gray-400">No text result returned</div>}
        </div>

        {/* Result CID (IPFS) */}
        <div className="mt-3 text-sm text-gray-300">
          Result CID:{" "}
          {resultCid ? (
            <a href={`https://gateway.pinata.cloud/ipfs/${resultCid}`} target="_blank" rel="noreferrer" className="underline text-[#00ff95]">
              {resultCid}
            </a>
          ) : (
            <span className="text-gray-500">No IPFS result available</span>
          )}
        </div>

        {/* minted image preview (uses metadata fetch logic, or fallback to model.cid) */}
        {mintedImageUrl && (
          <div className="mt-3">
            <div className="text-sm text-gray-300 mb-2">NFT preview:</div>
            <img src={mintedImageUrl} alt="Minted NFT" className="w-48 h-48 object-contain rounded-md border border-[#00ff95]/10" />
          </div>
        )}

        {/* Download PDF */}
        <div className="mt-3 flex items-center gap-3">
          {result ? (
            <button onClick={downloadReportPdf} className="px-4 py-2 rounded-md bg-[#0f8f61] text-white text-sm">
              Download Report (PDF)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// helpers
function formatAiTextToHtml(txt) {
  if (!txt) return "";
  const escapeHtml = (s) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  let t = escapeHtml(txt);
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/^##\s*(.+)$/gm, "<div class='ai-section ai-section-h4'>$1</div>");
  t = t.replace(/^#\s*(.+)$/gm, "<div class='ai-section ai-section-h3'>$1</div>");
  t = t.replace(/(^(-|\*|•)\s+.*(\n|$))+?/gm, (match) => {
    const items = match.trim().split(/\n+/).filter(Boolean).map((line) => line.replace(/^(-|\*|•)\s+/, ""));
    return `<ul class='ai-ul'>${items.map((it) => `<li class='ai-li'>${it}</li>`).join("")}</ul>`;
  });
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong class='ai-strong'>$1</strong>");
  t = t.replace(/\n{2,}/g, "</div><div class='ai-paragraph'>");
  t = t.replace(/\n/g, "<br/>");
  t = `<div class='ai-content'><div class='ai-paragraph'>${t}</div></div>`;
  t = t.replace(/(Estimated Yield[:\-\s])/gi, "<span class='ai-key'>$1</span>");
  t = t.replace(/(Confidence[:\-\s])/gi, "<span class='ai-key'>$1</span>");
  return t;
}
