import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#070812',
        panel: 'rgba(16, 19, 34, 0.72)',
        line: 'rgba(255, 255, 255, 0.1)',
        brand: {
          coral: '#ff6b6b',
          aqua: '#4fd1c5',
          gold: '#ffd166',
          violet: '#8b5cf6'
        }
      },
      boxShadow: {
        glow: '0 20px 70px rgba(79, 209, 197, 0.18)',
        panel: '0 24px 80px rgba(0, 0, 0, 0.36)'
      },
      backgroundImage: {
        'aurora-field':
          'radial-gradient(circle at 18% 12%, rgba(79, 209, 197, 0.24), transparent 28%), radial-gradient(circle at 78% 18%, rgba(255, 107, 107, 0.22), transparent 30%), linear-gradient(135deg, #070812 0%, #111322 45%, #141024 100%)'
      }
    }
  },
  plugins: [forms]
} satisfies Config;
