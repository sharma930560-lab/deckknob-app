/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#DFE104',
        'brand-dark': '#b8bc03',
        bg: '#09090B',
        surface: '#18181B',
        'surface-2': '#27272A',
        border: '#3F3F46',
      },
    },
  },
  plugins: [],
};
