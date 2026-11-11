/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1E75BB', // Official SK Cargo Blue
          dark: '#165B94',
          light: '#2D8AD1',
        },
        brand: {
          blue: '#1E75BB',
          'blue-light': '#E8F1FA',
          'blue-dark': '#165B94',
          orange: '#ED7D24', // Official SK Cargo Golden Orange/Yellow
          'orange-light': '#FEF4EC',
          'orange-dark': '#C96213',
        }
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      }
    },
  },
  plugins: [],
}

