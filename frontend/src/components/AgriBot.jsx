// src/components/AgriBot.jsx
import React, { useState, useEffect, useRef } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AgriBot() {
  const { provider, account } = useWeb3();

  const [paid, setPaid] = useState(false);
  const [statusMsg, setStatusMsg] = useState(""); // ✅ ADDED
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const ONE_TIME_FEE = 2000000n; // 2M wei

  // Scroll to bottom
  const scrollToBottom = () =>
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [messages]);

  const getSigner = async () => {
    if (!provider) return null;
    try {
      return await provider.getSigner();
    } catch {
      return null;
    }
  };

  // ==========================
  // ✅ PAYMENT (YOUR SNIPPET)
  // ==========================
  const payEntryFee = async () => {
    setStatusMsg("");

    if (!account) {
      setStatusMsg("⚠️ Please connect your wallet to continue.");
      return;
    }

    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: account,
        value: ONE_TIME_FEE
      });
      await tx.wait();
      setPaid(true);
      setStatusMsg("✅ AgriBot unlocked. Ask your questions below.");
    } catch (err) {
      if (err?.code === 4001) {
        setStatusMsg("❌ Transaction cancelled by user.");
      } else {
        setStatusMsg("❌ Payment failed. Please try again.");
      }
    }
  };

  // ==========================
  // ✅ JSON CLEANER
  // ==========================
  const sanitizeBotHtml = (html) => {
    if (!html) return "";

    // Remove ```json ``` blocks
    if (html.includes("```")) {
      const cleaned = html.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed?.message?.content) {
          return `<p>${parsed.message.content}</p>`;
        }
      } catch {
        return `<p>${cleaned}</p>`;
      }
    }
    return html;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/agri-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg.content })
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      const botMsg = {
        role: "assistant",
        content: sanitizeBotHtml(data.answerHtml), // ✅ FIXED
        links: data.links,
        chart: data.chartData
      };

      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "<p>❌ Error fetching response.</p>" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  // ==========================
  // RENDER
  // ==========================
  if (!paid) {
    return (
      <section id="agribot-section" className="w-full px-6 pt-12 pb-20">
        <div className="text-center mt-16">
          <h2 className="text-4xl font-bold text-[#00ff95] mb-6">
            Use AgriBot — Your Farming AI Guide
          </h2>

          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-4">
            Pay a tiny one-time QIE fee to unlock unlimited chat with AgriBot.
          </p>

          {statusMsg && (
            <p className="mb-4 text-yellow-300 font-medium">{statusMsg}</p>
          )}

          <button
            onClick={payEntryFee}
            className="px-6 py-3 bg-[#00ff95] text-black font-semibold rounded-xl shadow-lg hover:bg-[#5cff7a]"
          >
            Unlock AgriBot
          </button>
        </div>
       <div className="w-full border-t border-white/100 mt-10"></div>
      </section>
    );
  }

  return (
    <section id="agribot-section" className="w-full px-6 pt-12 pb-20">
      <div className="max-w-3xl mx-auto mt-10 mb-20 p-6 bg-[#061513] rounded-2xl border border-[#00ff95]/20">
        <h2 className="text-3xl font-extrabold text-white mb-6 text-center">
          AgriBot — Ask Anything
        </h2>

        <div className="h-[450px] overflow-y-auto p-4 bg-black/20 rounded-xl border border-[#00ff95]/20">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`my-3 p-3 rounded-xl max-w-[85%] ${
                msg.role === "user"
                  ? "bg-[#00ff95] text-black ml-auto"
                  : "bg-[#11221f] text-white mr-auto"
              }`}
            >
              {msg.role === "assistant" ? (
                <div dangerouslySetInnerHTML={{ __html: msg.content }} />
              ) : (
                msg.content
              )}

              {msg.links && (
                <div className="mt-2">
                  {msg.links.map((l, idx) => (
                    <a
                      key={idx}
                      href={l.url}
                      target="_blank"
                      className="text-[#5cff7a] underline block"
                    >
                      {l.title}
                    </a>
                  ))}
                </div>
              )}

              {msg.chart && msg.chart.labels?.length > 0 && (
                <div className="bg-black/30 mt-3 p-2 rounded-lg">
                  <Bar
                    data={{
                      labels: msg.chart.labels,
                      datasets: msg.chart.datasets
                    }}
                      options={{
                            responsive: true,
                            plugins: {
                              legend: { labels: { color: "#00ff95" } }
                            },
                            scales: {
                              x: { ticks: { color: "#00ff95" } },
                              y: { ticks: { color: "#00ff95" }, beginAtZero: true }
                            }
                          }}
                  />
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-black/40 text-white border border-[#00ff95]/20"
            placeholder="Ask AgriBot something..."
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-5 py-2 bg-[#00ff95] text-black rounded-xl"
          >
            {loading ? "Thinking…" : "Send"}
          </button>
        </div>

        <button
          onClick={clearChat}
          className="mt-4 text-sm text-red-400 underline"
        >
          Clear Chat
        </button>
      </div>
      <div className="w-full border-t border-white/100 mt-10"></div>
    </section>
  );
}
 