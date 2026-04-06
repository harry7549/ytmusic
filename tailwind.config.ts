import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: { 500: '#1DB954' },
        dark: { 100: '#282828', 200: '#121212' },
      },
    },
  },
  plugins: [],
};

export default config;
