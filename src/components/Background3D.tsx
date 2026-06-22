"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D, Float, Center, OrbitControls } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

function ScesiLogo() {
  const groupRef = useRef<THREE.Group>(null);
  const [scesWidth, setScesWidth] = useState(11.5);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle pulsing or rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const materialProps = {
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.9,
    wireframe: true,
    flatShading: true,
  };

  const bevelProps = {
    height: 0.4,
    curveSegments: 1, // Low poly style!
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 1, // Low poly bevel
  };

  const scesRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (scesRef.current) {
      scesRef.current.geometry.computeBoundingBox();
      if (scesRef.current.geometry.boundingBox) {
        const width = scesRef.current.geometry.boundingBox.max.x;
        setScesWidth(width + 0.3);
      }
    }
  }, []);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group ref={groupRef}>
        <Center>
          <group>
            {/* sces en grande (low poly) */}
            <Text3D
              ref={scesRef}
              font="/fonts/helvetiker_bold.typeface.json"
              size={4}
              position={[0, 0, 0]}
              {...bevelProps}
            >
              sces
              <meshStandardMaterial {...materialProps} />
            </Text3D>

            {/* Tallo de la 'i' (usando 'l' escalada) */}
            <Text3D
              font="/fonts/helvetiker_bold.typeface.json"
              size={4}
              position={[scesWidth, 0, 0]}
              scale={[1, 0.72, 1]}
              {...bevelProps}
            >
              l
              <meshStandardMaterial {...materialProps} />
            </Text3D>

            {/* Punto circular (low poly) superpuesto exactamente sobre la 'i' */}
            <mesh position={[scesWidth + 0.45, 3.8, 0.2]}>
              <icosahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>

            {/* UMSS pequeño alineado a la izquierda bajo la 'sc' */}
            <Text3D
              font="/fonts/helvetiker_bold.typeface.json"
              size={1.2}
              letterSpacing={0.05}
              position={[0.2, -1.6, 0]}
              {...bevelProps}
              bevelEnabled={false}
              height={0.2}
            >
              UMSS
              <meshStandardMaterial {...materialProps} />
            </Text3D>
          </group>
        </Center>
      </group>
    </Float>
  );
}

export default function Background3D() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0, // behind the terminal window
        pointerEvents: "auto", // allow orbit controls to work
        background: "#000000",
      }}
    >
      <div 
        style={{
          width: "100%",
          height: "100%",
          // Un glow sutil usando drop-shadow para igualar la estética de la terminal.
          // Al no ponerle opacidad baja, se verá claro, y los efectos globales (body::before) de la terminal le pondrán las scanlines y el parpadeo.
          filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.5)) blur(0.5px)",
        }}
      >
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
          <ScesiLogo />
          <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        </Canvas>
      </div>
    </div>
  );
}
