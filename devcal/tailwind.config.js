/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DevCal custom colors - space theme
        'space-dark': '#0a0a1a',
        'space-blue': '#1a1a3e',
        'space-purple': '#2d1b4e',
        'neon-blue': '#00d4ff',
        'neon-purple': '#b347d9',
        'neon-green': '#00ff88',
        'github-black': '#24292e',
        'neo4j-blue': '#008cc1',
        'alibaba-orange': '#ff6a00',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '100%': { boxShadow: '0 0 20px #00d4ff, 0 0 30px #00d4ff' },
        },
      },
    },
  },
  plugins: [],
}
