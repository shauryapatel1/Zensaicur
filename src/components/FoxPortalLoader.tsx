import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@react-three/drei';
import ThreeDCanvas from './ThreeDCanvas';

interface FoxPortalLoaderProps {
  isVisible: boolean;
  onComplete?: () => void;
}

function PortalScene() {
  return (
    <group>
      {/* Portal Ring */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[2, 0.1, 16, 100]} />
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Inner Portal Effect */}
      <mesh>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color="#a7f3d0" transparent opacity={0.3} />
      </mesh>
      
      {/* Floating Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 4
          ]}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      ))}
      
      {/* Zeno Placeholder (simple fox-colored sphere for now) */}
      <group position={[0, 0, 1]}>
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#fb923c" />
        </mesh>
        {/* Fox ears */}
        <mesh position={[-0.15, 0.25, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial color="#fb923c" />
        </mesh>
        <mesh position={[0.15, 0.25, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial color="#fb923c" />
        </mesh>
      </group>
    </group>
  );
}

function LoadingProgress() {
  const { progress } = useProgress();
  
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
      <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-zen-mint-400 to-zen-peach-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-white font-medium">
        Loading your zen space... {Math.round(progress)}%
      </p>
    </div>
  );
}

export default function FoxPortalLoader({ isVisible, onComplete }: FoxPortalLoaderProps) {
  const [showPortal, setShowPortal] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowPortal(true);
      // Simulate loading time
      const timer = setTimeout(() => {
        setShowPortal(false);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 bg-gradient-to-br from-zen-mint-500 via-zen-peach-500 to-zen-lavender-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Ripple Effect */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="w-full h-full bg-white rounded-full" />
          </motion.div>

          {/* 3D Portal Scene */}
          <div className="absolute inset-0">
            <ThreeDCanvas
              camera={{ position: [0, 0, 5], fov: 75 }}
              controls={false}
              environment={false}
            >
              <motion.group
                initial={{ scale: 0, rotateY: 0 }}
                animate={{ 
                  scale: showPortal ? 1 : 0,
                  rotateY: showPortal ? Math.PI * 2 : 0
                }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <PortalScene />
              </motion.group>
            </ThreeDCanvas>
          </div>

          {/* Loading Progress */}
          <LoadingProgress />

          {/* Zeno's Message */}
          <motion.div
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-display font-bold text-white mb-2">
              Welcome to Zensai
            </h2>
            <p className="text-white/90">
              Zeno is preparing your mindful space...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}