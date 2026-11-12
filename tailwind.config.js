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
        cargo: {
          blue: '#1E75BB',
          dark: '#0F4C81',
          mid: '#5BA3DC',
          yellow: '#FFC72C',
          'yellow-dark': '#E5A800',
          light: '#E8F2FB',
          bg: '#F5FAFE',
          ink: '#0B2540',
          muted: '#566B82',
          line: '#D8E6F3',
        },
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
      fontFamily: {
        'myanmar-serif': ['"Noto Serif Myanmar"', 'serif'],
        'space': ['"Space Grotesk"', 'sans-serif'],
        'jakarta': ['"Plus Jakarta Sans"', 'sans-serif'],
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

