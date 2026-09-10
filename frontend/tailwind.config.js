/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          500: '#6366f1',
          700: '#4338ca',
        },
      },
      boxShadow: {
        soft: '0 10px 25px -15px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
