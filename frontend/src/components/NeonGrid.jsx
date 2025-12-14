import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function NeonGrid() {
  const gridRef = useRef();

  useFrame((state, delta) => {
    gridRef.current.rotation.x += delta * 0.03;
    gridRef.current.rotation.z += delta * 0.02;
  });

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200, 80, 80]} />
      <meshBasicMaterial
        wireframe
        color={"#40ff88"}
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}
