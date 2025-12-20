export const COLORS = {
  primary: '#059df5',         // Brand Blue
  primaryDark: '#007ac2',     // Darker shade for press states
  primaryLight: '#e0f3ff',    // Very light blue for backgrounds/accents
  
  background: '#F4F7FB',      // Cool light grey-blue background (Modern)
  card: '#FFFFFF',            // Pure white for cards
  
  textPrimary: '#1a2e3b',     // Deep Slate for main text (High Contrast)
  textSecondary: '#64748b',   // Soft Grey for subtitles
  
  success: '#10b981',         // Modern Emerald Green
  error: '#ef4444',           // Modern Red
  border: '#e2e8f0',          // Subtle border color
};

export const SHADOWS = {
  medium: {
    shadowColor: COLORS.primary, // Blue-tinted shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};