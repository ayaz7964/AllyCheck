"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Professional Progress Circle Component
 * @param {number} percentage - The progress value (0 to 100)
 * @param {number} size - Total width/height of the SVG in pixels
 * @param {number} strokeWidth - Thickness of the progress line
 * @param {string} color - Hex or Tailwind color for the progress bar
 */
const ProgressCircle = ({ 
  percentage = 0, 
  size = 200, 
  strokeWidth = 16, 
  color = "#3b82f6" 
}) => {
  // Calculate SVG math
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate how much of the circle to "hide"
  // If percentage is 90, we show 90% of the circumference
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-800"
        />
        
        {/* Animated Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          {Math.round(percentage)}%
        </motion.span>
      </div>
    </div>
  );
};

// export default ProgressCircle;


import { useState } from "react";
// import ProgressCircle from "./ProgressCircle";

export default function Page() {
  const [val, setVal] = useState(90);

  return (
    <div className="p-20 space-y-4">
      <ProgressCircle percentage={val} color="#10b981" />
      <input 
        type="range" 
        onChange={(e) => setVal(e.target.value)} 
        className="w-full" 
      />
    </div>
  );
}