import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../config/theme';

interface LogoProps {
  width?: number;
  height?: number;
  color?: string; 
}

export default function Logo({ width = 100, height = 100, color = COLORS.primary }: LogoProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100" fill="none">
      <Path 
        d="M18 22 L50 78 L82 22" 
        stroke={color} 
        strokeWidth="14" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      <Path
        d="M50 48 C44 48 40 52 40 58 C40 66 50 76 50 76 C50 76 60 66 60 58 C60 52 56 48 50 48Z"
        fill={color}
      />

      <Circle cx="50" cy="58" r="3.5" fill="white"/>
    </Svg>
  );
}