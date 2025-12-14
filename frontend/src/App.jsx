// src/App.jsx
import Header from "./components/Header";
import Hero from "./components/Hero";
import ThreeScene from "./components/ThreeScene";
import RegisterModel from "./pages/RegisterModel"; // ensure path matches
import ExploreModels from "./components/ExploreModels";
import AgriBot from "./components/AgriBot";
import AgriInsights from "./components/AgriInsights";
import Contact from "./components/Contact";

export default function App() {
  return (
    <div className="w-full h-full relative overflow-x-hidden">

      {/* 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ThreeScene />
      </div>

      {/* UI Content */}
      <div className="relative z-10 flex flex-col gap-0">
        <Header />

        <div className="mt-20"> {/* avoid header overlap */}
          <Hero />
        </div>

        <div className="mt-5">
          <RegisterModel />
        </div>

        {/* ← NEW Explore Models section (same page) */}
        <div className="mt-5">
          <ExploreModels />
        </div>
        <div className="mt-5">
          <AgriBot />
        </div>
        <div className="mt-5">
          <AgriInsights />
        </div>
        <div className="mt-5">
          <Contact />
        </div>
      </div>

    </div>
  );
}
