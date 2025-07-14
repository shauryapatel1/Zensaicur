import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

interface ThreeDCanvasProps {
  children: React.ReactNode;
  camera?: {
    position?: [number, number, number];
    fov?: number;
  };
  controls?: boolean;
  environment?: boolean;
  className?: string;
}

export default function ThreeDCanvas({ 
  children, 
  camera = { position: [0, 0, 5], fov: 75 },
  controls = true,
  environment = true,
  className = "w-full h-full"
}: ThreeDCanvasProps) {
  return (
    <Canvas
      camera={camera}
      className={className}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        {environment && <Environment preset="dawn" />}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {children}
        {controls && <OrbitControls enableZoom={false} enablePan={false} />}
      </Suspense>
    </Canvas>
  );
}