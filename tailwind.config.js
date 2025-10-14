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
        primary: {
          DEFAULT: '#2775CA',
          light: '#4A8FDB',
          dark: '#14509E',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE55C',
          dark: '#D4AF37',
        },
        card: '#F5F7FA',
        blue: {
          50: '#EBF5FF',
          100: '#D6EBFF',
          200: '#B3D9FF',
          300: '#80C1FF',
          400: '#4DA9FF',
          500: '#2775CA',
          600: '#1E5FA8',
          700: '#14509E',
          800: '#0D3B72',
          900: '#062646',
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(180deg, #2775CA 0%, #14509E 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
}
