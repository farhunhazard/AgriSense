import React from "react";

export default function Contact() {
  return (
    <section id="contacts-section" className="w-full px-6 py-24">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        
        {/* ---------- LEFT CONTENT ---------- */}
        <div>
          <h2 className="text-4xl font-bold text-[#00ff95] mb-4">
            Get in Touch
          </h2>

          <p className="text-gray-400 mb-6 text-lg">
            Have questions about AgriSense, AI-powered predictions, NFTs, or
            blockchain-driven agriculture?
          </p>

          <p className="text-gray-400 mb-6">
            We’d love to hear from farmers, researchers, developers, and partners
            looking to build a smarter, sustainable agricultural ecosystem.
          </p>

          <div className="space-y-3 text-gray-300">
            <p>
              📍 <span className="font-semibold text-white">Focus:</span>{" "}
              AI × Blockchain × Agriculture
            </p>
            <p>
              🌱 <span className="font-semibold text-white">Mission:</span>{" "}
              Empower farmers with data-driven decisions
            </p>
            <p>
              🔗 <span className="font-semibold text-white">Built for:</span>{" "}
              DeFi, NFTs Beyond Art, AI x Blockchain
            </p>
          </div>
        </div>

        {/* ---------- RIGHT FORM ---------- */}
        <div className="bg-[#061513] border border-[#00ff95]/20 rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-white mb-6">
            Contact AgriSense
          </h3>

          <form className="space-y-5">
            <input
              type="text"
              placeholder="Your Name"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-[#00ff95]/20 focus:outline-none focus:border-[#00ff95]"
            />

            <input
              type="email"
              placeholder="Your Email"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-[#00ff95]/20 focus:outline-none focus:border-[#00ff95]"
            />

            <textarea
              rows="4"
              placeholder="Your Message"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-[#00ff95]/20 focus:outline-none focus:border-[#00ff95]"
            />

            <button
              type="button"
              className="w-full py-3 bg-[#00ff95] text-black font-semibold rounded-xl hover:bg-[#5cff7a] transition"
            >
              Send Message
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            * Demo contact form for hackathon submission
          </p>
        </div>
      </div>
    </section>
  );
}
