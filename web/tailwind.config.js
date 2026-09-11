/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          900: '#070A12',
          850: '#0B0F19',
          800: '#101726',
          700: '#1E293B',
          600: '#334155',
          accent: '#10B981',
          cyan: '#06B6D4',
          danger: '#EF4444'
        },
        tg: {
          bg: 'var(--tg-theme-bg-color, #0B0F19)',
          text: 'var(--tg-theme-text-color, #F8FAFC)',
          hint: 'var(--tg-theme-hint-color, #94A3B8)',
          link: 'var(--tg-theme-link-color, #06B6D4)',
          button: 'var(--tg-theme-button-color, #10B981)',
          buttonText: 'var(--tg-theme-button-text-color, #070A12)',
          secondaryBg: 'var(--tg-theme-secondary-bg-color, #101726)'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
