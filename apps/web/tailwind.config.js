/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F8F6F0',
        charcoal: '#2C3E50',
        amber: '#E67E22',
      },
    },
  },
  plugins: [],
};
