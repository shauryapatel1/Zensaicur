import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import ThreeDCanvas from './ThreeDCanvas';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';

interface MoodOrbsProps {
  selectedMood?: MoodLevel;
  onMoodSelect: (mood: MoodLevel) => void;
  disabled?: boolean;
  className?: string;
}

interface OrbProps {
  mood: typeof moods[0];
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  position: [number, number, number];
}

function MoodOrb({ mood, isSelected, isHovered, onHover, onClick, position }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [clicked, setClicked] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Rotation based on mood level
      meshRef.current.rotation.y += 0.005 * mood.level;
      
      // Scale animation for hover and selection
      const targetScale = isSelected ? 1.3 : isHovered ? 1.2 : 1;
      meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale } as any, 0.1);
    }
  });

  const handleClick = () => {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 200);
  };

  // Color mapping for each mood
  const orbColors = {
    1: "#ef4444", // red for struggling
    2: "#f97316", // orange for low  
    3: "#eab308", // yellow for neutral
    4: "#22c55e", // green for good
    5: "#8b5cf6"  // purple for amazing
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={orbColors[mood.level as keyof typeof orbColors]}
          transparent
          opacity={isSelected ? 0.9 : 0.7}
          emissive={orbColors[mood.level as keyof typeof orbColors]}
          emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.2 : 0.1}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* Glow effect for selected/hovered orbs */}
      {(isSelected || isHovered) && (
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color={orbColors[mood.level as keyof typeof orbColors]}
            transparent
            opacity={0.1}
          />
        </mesh>
      )}
      
      {/* Particle effects for selected orb */}
      {isSelected && (
        <group>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i / 8) * Math.PI * 2) * 0.8,
                Math.sin((i / 8) * Math.PI * 2) * 0.8,
                0
              ]}
            >
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial
                color={orbColors[mood.level as keyof typeof orbColors]}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function OrbsScene({ selectedMood, onMoodSelect, disabled }: Omit<MoodOrbsProps, 'className'>) {
  const [hoveredMood, setHoveredMood] = useState<MoodLevel | null>(null);

  // Arrange orbs in a gentle arc
  const orbPositions: [number, number, number][] = [
    [-3, 0, 0],   // struggling
    [-1.5, 0, 0], // low
    [0, 0, 0],    // neutral
    [1.5, 0, 0],  // good
    [3, 0, 0]     // amazing
  ];

  return (
    <group>
      {moods.map((mood, index) => (
        <MoodOrb
          key={mood.level}
          mood={mood}
          isSelected={selectedMood === mood.level}
          isHovered={hoveredMood === mood.level}
          onHover={(hovered) => setHoveredMood(hovered ? mood.level : null)}
          onClick={() => !disabled && onMoodSelect(mood.level)}
          position={orbPositions[index]}
        />
      ))}
      
      {/* Ambient lighting for the orbs */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 5, 5]} intensity={0.8} />
    </group>
  );
}

export default function MoodOrbs({ 
  selectedMood, 
  onMoodSelect, 
  disabled = false, 
  className = "w-full h-64" 
}: MoodOrbsProps) {
  const [hoveredMood, setHoveredMood] = useState<MoodLevel | null>(null);

  return (
    <div className={className}>
      {/* 3D Orbs */}
      <div className="relative w-full h-full">
        <ThreeDCanvas
          camera={{ position: [0, 2, 6], fov: 60 }}
          controls={false}
          environment={false}
        >
          <OrbsScene
            selectedMood={selectedMood}
            onMoodSelect={onMoodSelect}
            disabled={disabled}
          />
        </ThreeDCanvas>
        
        {/* Overlay for mood labels and emoji */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="flex items-end justify-between h-full px-8 pb-8">
            {moods.map((mood, index) => {
              const isSelected = selectedMood === mood.level;
              const isHovered = hoveredMood === mood.level;
              const isVisible = isSelected || isHovered;
              
              return (
                <div key={mood.level} className="flex-1 flex flex-col items-center">
                  <AnimatePresence>
                    {isVisible && (
                      <motion.div
                        className="text-center mb-4"
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="text-4xl mb-2">{mood.emoji}</div>
                        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                          <div className="text-sm font-medium text-zen-sage-800 dark:text-gray-200">
                            {mood.label}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Invisible hover area to sync with 3D orb */}
                  <div
                    className="w-16 h-16 pointer-events-auto cursor-pointer"
                    onMouseEnter={() => setHoveredMood(mood.level)}
                    onMouseLeave={() => setHoveredMood(null)}
                    onClick={() => !disabled && onMoodSelect(mood.level)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <motion.p
        className="text-center text-sm text-zen-sage-600 dark:text-gray-400 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Hover over the orbs to see mood options, click to select
      </motion.p>
    </div>
  );
}