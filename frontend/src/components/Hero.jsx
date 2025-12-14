// src/components/Hero.jsx
export default function Hero() {

  const scrollToExplore = () => {
    const section = document.getElementById("explore-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="home-section"
      className="
        relative w-full
        flex flex-col justify-center items-center text-center px-6
        pt-32 pb-12
      "
    >
      {/* SECTION TITLE */}
      <h2
        className="
          text-4xl font-bold text-white mb-8
          underline underline-offset-[12px] decoration-[#00ff95]/60
        "
      >
        Home
      </h2>

      {/* Glow Background */}
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="w-[700px] h-[700px] rounded-full bg-[#00ff95] opacity-10 blur-[180px]"></div>
      </div>

      {/* MAIN TAGLINE */}
      <h1
        className="
          text-5xl md:text-6xl font-extrabold text-white leading-tight
          drop-shadow-[0_0_35px_#00ff95]
          max-w-5xl
        "
      >
        Decentralizing Agricultural Intelligence with{" "}
        <span className="text-[#55ff9f]">AI + QIE Blockchain</span>
      </h1>

      {/* SUBTAGLINE - Catchy */}
      <p className="mt-6 text-2xl md:text-3xl text-[#79ffbc] font-semibold drop-shadow-[0_0_10px_#00ff95] max-w-4xl">
        "Grow More. Waste Less. Farm Smarter — Powered by QIE."
      </p>

      {/* OVERVIEW */}
      <p
        className="
          mt-6 text-lg md:text-xl text-gray-300 max-w-3xl leading-relaxed
        "
      >
        AgriSense is an AI-driven agricultural intelligence platform enabling farmers 
        to upload crop data, run advanced AI models, and store predictions securely on 
        the QIE Blockchain. Developers can deploy and monetize their AI models — while 
        farmers receive trusted, transparent, and tamper-proof insights.
      </p>

      {/* VALUE PROPOSITIONS */}
      <div className="mt-8 text-gray-300 text-lg max-w-3xl space-y-2">
        <p>🌾 AI-powered crop predictions for healthier harvests.</p>
        <p>🔗 QIE-secured storage ensures immutable and farmer-owned data.</p>
        <p>🤖 Plug-and-play AI model registry for developers.</p>
        <p>⚡ Faster decisions with decentralized intelligence.</p>
      </div>

      {/* CTA BUTTON */}
      <button
        onClick={scrollToExplore}
        className="
          mt-10 px-12 py-4 text-xl font-semibold rounded-xl
          bg-[#00ff95] text-black shadow-[0_0_20px_#00ff95]
          hover:shadow-[0_0_40px_#00ff95] hover:scale-105
          transition-all duration-300
        "
      >
        Explore Models
      </button>

      {/* SECTION DIVIDER */}
      <div className="w-full border-t border-white/100 mt-10"></div>
    </section>
  );
}
