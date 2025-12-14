// src/components/Panel.jsx
import React from "react";
import { Html } from "@react-three/drei";

export default function Panel({ position = [0,0,0], rotation=[0,0,0], children, width=18, height=10 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={"#ffffff"} opacity={0.85} transparent />
      </mesh>

      <Html transform distanceFactor={1.2} position={[0, 0, 0.01]}>
        <div className="w-[720px]">
          {children}
        </div>
      </Html>
    </group>
  );
}
