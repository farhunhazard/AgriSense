// src/components/ThreeScene.jsx
import React from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import NeonGrid from "./NeonGrid";

export default function ThreeScene() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 2, 12], fov: 65 }} gl={{ alpha: true }}>
        <color attach="background" args={["#000"]} />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#55ff9f" />

        <NeonGrid />
        <Stars radius={120} depth={70} count={2000} factor={4} fade />

      </Canvas>
    </div>
  );
}
