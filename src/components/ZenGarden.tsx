import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import ThreeDCanvas from './ThreeDCanvas';
import { MoodLevel } from '../types';

interface ZenGardenProps {
  lastMood?: MoodLevel;
  className?: string;
}

function Tree({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Tree trunk */}
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Tree foliage */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

function Stone({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <dodecahedronGeometry args={[0.3]} />
      <meshStandardMaterial color="#6b7280" roughness={0.8} />
    </mesh>
  );
}

function ZenoFox({ mood }: { mood?: MoodLevel }) {
  const foxRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (foxRef.current) {
      foxRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      foxRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  // Change fox color based on mood
  const foxColor = mood ? {
    1: "#ef4444", // red for struggling
    2: "#f97316", // orange for low
    3: "#eab308", // yellow for neutral
    4: "#22c55e", // green for good
    5: "#8b5cf6"  // purple for amazing
  }[mood] : "#fb923c";

  return (
    <group ref={foxRef} position={[0, 0.5, 0]}>
      {/* Fox body */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={foxColor} />
      </mesh>
      {/* Fox ears */}
      <mesh position={[-0.15, 0.25, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color={foxColor} />
      </mesh>
      <mesh position={[0.15, 0.25, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color={foxColor} />
      </mesh>
      {/* Fox tail */}
      <mesh position={[0, -0.1, -0.3]} rotation={[0.5, 0, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color={foxColor} />
      </mesh>
    </group>
  );
}

function FloatingLeaves() {
  const leavesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (leavesRef.current) {
      leavesRef.current.children.forEach((leaf, i) => {
        leaf.position.x += Math.sin(state.clock.elapsedTime + i) * 0.001;
        leaf.position.y += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.001;
        leaf.rotation.z += 0.01;
      });
    }
  });

  return (
    <group ref={leavesRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 8,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 8
          ]}
          rotation={[Math.random(), Math.random(), Math.random()]}
        >
          <planeGeometry args={[0.1, 0.15]} />
          <meshStandardMaterial 
            color="#fbbf24" 
            transparent 
            opacity={0.7}
            side={2}
          />
        </mesh>
      ))}
    </group>
  );
}

function GardenScene({ lastMood }: { lastMood?: MoodLevel }) {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#a3a3a3" />
      </mesh>
      
      {/* Center stone where Zeno sits */}
      <Stone position={[0, 0, 0]} />
      
      {/* Zeno fox */}
      <ZenoFox mood={lastMood} />
      
      {/* Trees around the clearing */}
      <Tree position={[-2, 0, -2]} />
      <Tree position={[2, 0, -2]} />
      <Tree position={[-2, 0, 2]} />
      <Tree position={[2, 0, 2]} />
      <Tree position={[0, 0, -3]} />
      
      {/* Additional stones */}
      <Stone position={[-1, 0, 1]} />
      <Stone position={[1, 0, -1]} />
      
      {/* Floating leaves */}
      <FloatingLeaves />
    </group>
  );
}

export default function ZenGarden({ lastMood, className = "w-full h-96" }: ZenGardenProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <ThreeDCanvas
        camera={{ position: [0, 3, 5], fov: 60 }}
        controls={true}
        environment={true}
      >
        <GardenScene lastMood={lastMood} />
      </ThreeDCanvas>
    </motion.div>
  );
}