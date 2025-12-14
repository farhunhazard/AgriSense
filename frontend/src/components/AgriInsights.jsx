import React, { useEffect, useRef, useState } from "react";

/* ---------------- BLOG DATA ---------------- */
const insights = [
  {
    title: "Modern Rice Cultivation in India",
    category: "Crop Management",
    summary:
      "Best practices for rice farming including land preparation, transplanting, irrigation scheduling, and nutrient management for higher yields.",
    content: `
Rice cultivation in India depends on proper land preparation, puddling, 
high-yielding varieties, balanced fertilization, and continuous water management. 
Critical stages include tillering and flowering, where water stress must be avoided.
`,
    // ✅ FIXED IMAGE (UNSPLASH – STABLE)
    image:
      "https://media.istockphoto.com/id/1514263263/photo/group-of-indian-village-farmers-working-in-a-paddy-field.jpg?s=1024x1024&w=is&k=20&c=DtA8IpdQGTz57tueXv1K9Uw5Z32Yc1qsdguHPiYwYrs="
  },
  {
    title: "Wheat Farming: From Sowing to Harvest",
    category: "Cereal Crops",
    summary:
      "An end-to-end guide covering wheat varieties, soil preparation, fertilizer application, and irrigation timing for optimal grain quality.",
    content: `
Wheat requires well-drained soil, timely sowing during rabi season, 
balanced NPK application, and irrigation at CRI, tillering, and grain filling stages.
`,
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Soil Health & Sustainable Farming",
    category: "Soil Science",
    summary:
      "How organic matter, crop rotation, and balanced fertilization improve soil structure, fertility, and long-term productivity.",
    content: `
Healthy soil improves crop resilience. Organic matter, green manure, 
crop rotation, and soil testing are essential for sustainable productivity.
`,
    // ✅ FIXED IMAGE (UNSPLASH – STABLE)
    image:
      "https://plus.unsplash.com/premium_photo-1663100110235-8e2b33c305a1?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    title: "Water Optimization for Crops",
    category: "Irrigation",
    summary:
      "Smart irrigation strategies to reduce water waste while ensuring crops receive sufficient moisture.",
    content: `
Drip irrigation, mulching, and scheduling irrigation based on crop stage 
significantly reduce water wastage and improve yields.
`,
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "AI in Agriculture: The Future",
    category: "AI & Innovation",
    summary:
      "How AI-powered predictions and automation are transforming modern agriculture.",
    content: `
AI enables yield prediction, disease detection, climate forecasting, 
and precision farming for better decision-making.
`,
    image:
      "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=900&q=80"
  }
];

/* ---------------- COMPONENT ---------------- */
export default function AgriInsights() {
  const sliderRef = useRef(null);
  const [activeBlog, setActiveBlog] = useState(null);

  /* -------- AUTO SCROLL (5s) -------- */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sliderRef.current) return;

      sliderRef.current.scrollBy({ left: 320, behavior: "smooth" });

      if (
        sliderRef.current.scrollLeft + sliderRef.current.clientWidth >=
        sliderRef.current.scrollWidth
      ) {
        sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    // ✅ REMOVED DARK BACKGROUND
    <section id="agriinsights-section" className="w-full px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-[#00ff95] mb-4 text-center">
          AgriSense Insights
        </h2>
        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
          Agriculture knowledge curated by AI — crops, soil, water, and innovation.
        </p>

        {/* -------- SLIDER -------- */}
        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
        >
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="min-w-[300px] bg-[#061513] border border-[#00ff95]/20 rounded-2xl shadow-lg"
            >
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="w-full h-40 object-cover rounded-t-2xl"
              />

              <div className="p-4">
                <span className="text-xs text-[#00ff95] font-semibold uppercase">
                  {item.category}
                </span>

                <h3 className="text-lg font-bold text-white mt-2">
                  {item.title}
                </h3>

                <p className="text-sm text-gray-300 mt-2">
                  {item.summary}
                </p>

                <button
                  onClick={() => setActiveBlog(item)}
                  className="mt-4 text-sm text-[#00ff95] font-semibold hover:underline"
                >
                  Read more →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------- MODAL -------- */}
      {activeBlog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#061513] max-w-lg w-full rounded-2xl p-6 border border-[#00ff95]/30">
            <h3 className="text-2xl font-bold text-[#00ff95] mb-2">
              {activeBlog.title}
            </h3>
            <p className="text-gray-300 text-sm mb-4 whitespace-pre-line">
              {activeBlog.content}
            </p>

            <button
              onClick={() => setActiveBlog(null)}
              className="mt-4 px-4 py-2 bg-[#00ff95] text-black rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="w-full border-t border-white/100 mt-10"></div>
    </section>
  );
}
