/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f9f3',
          100: '#dcf0e4',
          200: '#bbe1cb',
          300: '#8ec9ab',
          400: '#5dac86',
          500: '#3a9067',
          600: '#2b7352',
          700: '#245c43',
          800: '#1f4a37',
          900: '#1b3d2f',
          950: '#0c221a',
        },
        harvest: {
          50: '#fdfbe8',
          100: '#fcf6c5',
          200: '#faec8e',
          300: '#f7dc4f',
          400: '#f3c71e',
          500: '#dfac0f',
          600: '#c1860a',
          700: '#9a610c',
          800: '#804c11',
          900: '#6d3f13',
        },
        earth: {
          50: '#f8f6f4',
          100: '#efebe6',
          200: '#ded5ca',
          300: '#c9b8a7',
          400: '#b29883',
          500: '#a1816a',
          600: '#8b6b55',
          700: '#715444',
          800: '#5f463b',
          900: '#503c34',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
