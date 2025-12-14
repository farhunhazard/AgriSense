// src/context/Web3Context.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import ModelRegistryABI from "../abi/ModelRegistry.json";
import PredictionRegistryABI from "../abi/PredictionRegistry.json"; // add contract ABI to src/abi

const Web3Context = createContext();
export const useWeb3 = () => useContext(Web3Context);

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xFc947Cdde836ffE202d6166d4b58891F789a01D3";
const PREDICTION_REGISTRY_ADDRESS = import.meta.env.VITE_PREDICTION_REGISTRY || "0x30Ffb2b780bA89A82eCF58419A7987c754E15420";
const QIE_CHAIN = {
  chainId: "0x7BF",
  chainName: "QIE Testnet",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: ["https://rpc1testnet.qie.digital", "https://testnetqierpc1.digital/"],
  blockExplorerUrls: ["https://testnet.qie.digital"],
};

const showToast = (message, type = "error") => {
  const t = document.createElement("div");
  t.className = `
    fixed top-5 left-1/2 -translate-x-1/2 px-4 py-3 
    rounded-xl text-white text-sm z-[99999]
    shadow-lg transition-all duration-300
    ${type === "error" ? "bg-red-500" : "bg-green-500"}
  `;
  t.innerText = message;
  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = 0), 2500);
  setTimeout(() => t.remove(), 3000);
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);

  const [readProvider, setReadProvider] = useState(null);
  const [readContract, setReadContract] = useState(null);
  const [readRpcUrl, setReadRpcUrl] = useState(import.meta.env.VITE_READ_RPC || "https://rpc1testnet.qie.digital");
  const [rpcStatus, setRpcStatus] = useState({ ok: false, block: null, url: readRpcUrl });

  const [models, setModels] = useState([]);

  const DEPLOY_BLOCK = Number(import.meta.env.VITE_DEPLOY_BLOCK || 0);

  const fetchInProgressRef = useRef(false);
  const lastFetchedBlockRef = useRef(DEPLOY_BLOCK || 0);
  const contractEventListenerRef = useRef(null);

  const getProviderList = () => {
    const eth = window.ethereum;
    if (!eth) return { metamask: null, qie: null };
    const providers = eth.providers || [eth];
    return {
      metamask: providers.find((p) => p.isMetaMask),
      qie: providers.find((p) => p.isQIEWallet || p.walletName === "QIE Wallet"),
    };
  };

  const switchToQIE = async (ethProvider) => {
    try {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: QIE_CHAIN.chainId }],
      });
    } catch (err) {
      if (err?.code === 4902) {
        await ethProvider.request({
          method: "wallet_addEthereumChain",
          params: [QIE_CHAIN],
        });
      }
    }
  };

  const connectMetaMask = async () => {
    const { metamask } = getProviderList();
    if (!metamask) return showToast("MetaMask not installed!", "error");
    const acc = await metamask.request({ method: "eth_requestAccounts" });
    await switchToQIE(metamask).catch(() => {});
    setAccount(acc[0] || null);
    setProvider(new ethers.BrowserProvider(metamask));
    showToast("MetaMask Connected!", "success");
  };

  const connectWalletConnect = async () => {
    try {
      const wc = await EthereumProvider.init({
        projectId: import.meta.env.VITE_WC_PROJECT_ID || "YOUR_WC_PROJECT",
        chains: [1983],
        showQrModal: true,
      });
      await wc.connect();
      setAccount(wc.accounts[0] || null);
      setProvider(new ethers.BrowserProvider(wc));
      showToast("WalletConnect Connected!", "success");
    } catch (e) {
      console.error("WalletConnect error:", e);
      showToast("WalletConnect failed!", "error");
    }
  };

  const connectQIEWallet = async () => {
    const { qie } = getProviderList();
    if (!qie) return showToast("QIE Wallet not installed!", "error");
    const acc = await qie.request({ method: "eth_requestAccounts" });
    setAccount(acc[0] || null);
    setProvider(new ethers.BrowserProvider(qie));
    showToast("QIE Wallet Connected!", "success");
  };

  const connectWallet = async (walletType) => {
    try {
      if (walletType === "MetaMask") await connectMetaMask();
      if (walletType === "WalletConnect") await connectWalletConnect();
      if (walletType === "QIE Wallet") await connectQIEWallet();
    } catch (e) {
      console.error("connectWallet:", e);
      showToast("Failed to connect wallet.", "error");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setModels([]); // clear local models on disconnect
    showToast("Wallet disconnected", "success");
  };

  // read provider initialization (tries available RPCs)
  useEffect(() => {
    const tryUrls = import.meta.env.VITE_READ_RPC ? [import.meta.env.VITE_READ_RPC] : [...QIE_CHAIN.rpcUrls];
    let cancelled = false;

    async function initRead() {
      for (const url of tryUrls) {
        try {
          const p = new ethers.JsonRpcProvider(url);
          const block = await p.getBlockNumber();
          if (cancelled) return;
          setReadProvider(p);
          const rContract = new ethers.Contract(CONTRACT_ADDRESS, ModelRegistryABI.abi, p);
          setReadContract(rContract);
          setReadRpcUrl(url);
          setRpcStatus({ ok: true, block, url });
          console.log("✅ Read RPC OK:", url, "block:", block);
          if (!lastFetchedBlockRef.current && DEPLOY_BLOCK) lastFetchedBlockRef.current = DEPLOY_BLOCK;
          return;
        } catch (err) {
          console.warn("Read RPC failed for", url, err?.message || err);
          setRpcStatus({ ok: false, block: null, url });
        }
      }
      setReadProvider(null);
      setReadContract(null);
      setRpcStatus((s) => ({ ...s, ok: false }));
    }

    initRead();
    return () => { cancelled = true; };
  }, []);

  // signer contract for writes + attach ModelRegistered listener (non-blocking)
  useEffect(() => {
    let mounted = true;
    let attachedContract = null;

    async function loadContract() {
      try {
        if (!provider) {
          setContract(null);
          return;
        }
        const signer = await provider.getSigner();
        const ctr = new ethers.Contract(CONTRACT_ADDRESS, ModelRegistryABI.abi, signer);
        setContract(ctr);
        attachedContract = ctr;
        console.log("✅ Contract (signer) loaded:", CONTRACT_ADDRESS);

        // Attach event listener to pick up new models live and merge them into models list
        // We simply trigger fetchModels(true) to get an updated authoritative list.
        const handler = (...args) => {
          // args may contain event params; just trigger a forced fetch
          console.log("🔔 ModelRegistered event detected — refreshing models list");
          fetchModels(true).catch((e) => console.error("fetchModels (event) failed:", e));
        };

        // keep ref to handler to allow removal later
        contractEventListenerRef.current = { contract: ctr, handler };
        try {
          ctr.on("ModelRegistered", handler);
        } catch (e) {
          // some providers may not support direct event attaching; ignore gracefully
          console.warn("Could not attach ModelRegistered listener:", e?.message || e);
        }
      } catch (err) {
        console.error("❌ loadContract failed:", err);
        setContract(null);
      }
    }

    loadContract();

    return () => {
      mounted = false;
      // cleanup listener if attached
      try {
        if (contractEventListenerRef.current) {
          const { contract: c, handler } = contractEventListenerRef.current;
          if (c && typeof c.off === "function") {
            c.off("ModelRegistered", handler);
          }
          contractEventListenerRef.current = null;
        }
      } catch (e) {
        console.warn("Error cleaning up contract listener:", e);
      }
    };
  }, [provider]); // reload when provider changes

  // optional: also create a signer contract handle for PredictionRegistry writes (not created here but helper below)
  const getPredictionRegistrySigner = () => {
    try {
      if (!provider) return null;
      const signer = provider.getSigner();
      return new ethers.Contract(PREDICTION_REGISTRY_ADDRESS, PredictionRegistryABI.abi, signer);
    } catch {
      return null;
    }
  };

  // fetchModels function — reads events and mapping using readContract
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const fetchModels = async (force = false) => {
    if (!readContract || !readProvider) {
      console.log("⚠️ fetchModels: no read contract/provider");
      return [];
    }
    if (fetchInProgressRef.current && !force) {
      console.log("Fetch already in progress - skipping.");
      return [];
    }
    fetchInProgressRef.current = true;

    try {
      const latest = await readProvider.getBlockNumber();
      console.log("🔍 Starting event scan... latest block =", latest);

      let from = lastFetchedBlockRef.current && lastFetchedBlockRef.current > 0 ? lastFetchedBlockRef.current : (DEPLOY_BLOCK || 0);

      if (from === 0 && !DEPLOY_BLOCK) {
        const safeStart = Math.max(0, latest - 100000);
        console.warn("No DEPLOY_BLOCK set — starting scan from", safeStart);
        from = safeStart;
      }

      if (from > latest && !force) {
        console.log("No new blocks to scan.");
        fetchInProgressRef.current = false;
        return [];
      }

      const filter = readContract.filters.ModelRegistered?.();
      if (!filter) {
        console.warn("Contract has no ModelRegistered filter");
        fetchInProgressRef.current = false;
        return [];
      }

      let batchSize = Number(import.meta.env.VITE_BATCH_SIZE || 5000);
      const minBatch = 500;
      const discoveredLogs = [];

      // when force is true, we scan a reasonable recent window instead of relying solely on from
      const scanStart = force ? Math.max(DEPLOY_BLOCK || 0, latest - (batchSize * 2)) : from;

      for (let start = scanStart; start <= latest; start = Math.min(start + batchSize + 1, latest + 1)) {
        const end = Math.min(start + batchSize, latest);
        try {
          const partial = await readContract.queryFilter(filter, start, end);
          console.log(`📦 Batch ${start} → ${end}: ${partial.length} events`);
          discoveredLogs.push(...partial);
          await sleep(150);
        } catch (err) {
          const msg = err?.message || String(err);
          console.warn(`⚠️ RPC batch failed ${start}→${end}`, msg);
          if (msg.includes("maximum") || msg.includes("blocks distance") || err?.code === -32000) {
            const newBatch = Math.max(minBatch, Math.floor(batchSize / 5));
            if (newBatch === batchSize) {
              console.error("Can't reduce batch size further; aborting fetchModels.");
              throw err;
            }
            console.warn(`Reducing batchSize ${batchSize} -> ${newBatch} due to RPC limits`);
            batchSize = newBatch;
            continue;
          } else {
            console.warn("Non-window error during logs fetch; skipping this batch.", msg);
          }
        }
      }

      console.log("📊 Total events found:", discoveredLogs.length);

      const unique = new Map();
      for (const ev of discoveredLogs) {
        try {
          const id = ev.args.id;
          let modelTuple;
          if (typeof readContract.getModel === "function") {
            modelTuple = await readContract.getModel(id);
            const model = {
              provider: modelTuple[0],
              cid: modelTuple[1],
              price: modelTuple[2]?.toString?.() || "0",
              active: modelTuple[3],
              category: modelTuple[4] || "general",
            };
            unique.set(String(id), {
              id,
              name: ethers.decodeBytes32String(id),
              cid: model.cid,
              price: model.price,
              provider: model.provider,
              active: model.active,
              category: model.category,
            });
          } else {
            const m = await readContract.models(id);
            unique.set(String(id), {
              id,
              name: ethers.decodeBytes32String(id),
              cid: m.cid,
              price: m.price?.toString?.() || "0",
              provider: m.provider,
              active: m.active,
              category: m.category || "general",
            });
          }
        } catch (innerErr) {
          console.warn("Failed to read mapping for event id:", innerErr?.message || innerErr);
        }
      }

      const arr = Array.from(unique.values());
      console.log("✅ Final model list:", arr);

      // Merge with existing models rather than overwriting completely to avoid flash of empty list
      setModels((prev) => {
        const map = new Map(prev.map((p) => [String(p.id), p]));
        for (const m of arr) {
          map.set(String(m.id), m);
        }
        return Array.from(map.values());
      });

      lastFetchedBlockRef.current = latest + 1;
      fetchInProgressRef.current = false;
      return arr;
    } catch (err) {
      console.error("❌ fetchModels ERROR:", err);
      fetchInProgressRef.current = false;
      return [];
    }
  };

  // --- Prediction helpers (write + read)
  const recordPredictionOnChain = async (modelIdBytes32, cid, mint = true, beneficiary = null) => {
    if (!provider) throw new Error("wallet not connected");
    const registry = getPredictionRegistrySigner();
    if (!registry) throw new Error("prediction registry not available");
    const to = beneficiary || account;
    const tx = await registry.recordPrediction(modelIdBytes32, cid, to, mint);
    const receipt = await tx.wait();
    return { tx, receipt };
  };

  const fetchPredictionsForModel = async (modelIdBytes32) => {
    try {
      const predRead = new ethers.Contract(PREDICTION_REGISTRY_ADDRESS, PredictionRegistryABI.abi, readProvider || provider);
      if (typeof predRead.getPredictionsForModel === "function") {
        const arr = await predRead.getPredictionsForModel(modelIdBytes32);
        return arr.map((p) => ({
          id: p.id.toString(),
          modelId: p.modelId,
          requester: p.requester,
          cid: p.cid,
          timestamp: Number(p.timestamp),
          tokenId: Number(p.tokenId || 0),
        }));
      } else {
        const filter = predRead.filters.PredictionRecorded?.();
        if (!filter) return [];
        const logs = await predRead.queryFilter(filter, DEPLOY_BLOCK || 0, "latest");
        const out = [];
        for (const ev of logs) {
          const args = ev.args;
          if (!args) continue;
          if (String(args.modelId) === String(modelIdBytes32)) {
            out.push({
              id: args.id.toString(),
              modelId: args.modelId,
              requester: args.requester,
              cid: args.cid,
              timestamp: (ev.blockNumber || 0),
              tokenId: Number(args.tokenId || 0),
              txHash: ev.transactionHash,
            });
          }
        }
        return out;
      }
    } catch (err) {
      console.error("fetchPredictionsForModel err", err);
      return [];
    }
  };

  // Add a local model to models list (called by RegisterModel after successful tx)
  const addLocalModel = (uiModel) => {
    if (!uiModel || !uiModel.id) return;
    setModels((prev) => {
      const map = new Map(prev.map((m) => [String(m.id), m]));
      // ensure id stored as string key for consistency
      map.set(String(uiModel.id), {
        ...(map.get(String(uiModel.id)) || {}),
        ...uiModel,
      });
      // keep newest first for visibility
      const arr = Array.from(map.values());
      // move inserted model to front
      const inserted = arr.find((x) => String(x.id) === String(uiModel.id));
      const others = arr.filter((x) => String(x.id) !== String(uiModel.id));
      return inserted ? [inserted, ...others] : arr;
    });
  };

  // expose context value
  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        contract,
        connectWallet,
        disconnectWallet,
        models,
        fetchModels,
        readRpcStatus: rpcStatus,
        readRpcUrl,
        readProvider,
        readContract,
        recordPredictionOnChain,
        fetchPredictionsForModel,
        addLocalModel, // <- expose this so RegisterModel can call it
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
