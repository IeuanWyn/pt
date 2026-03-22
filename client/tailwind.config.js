/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf6',
          100: '#c5cae9',
          600: '#1a237e',
          700: '#141b69',
          800: '#0d1247',
          900: '#080b2e',
          950: '#04061a',
        },
        strava: '#FC4C02',
        orange: {
          500: '#f97316',
          600: '#ea580c',
        },
      },
    },
  },
  plugins: [],
}
