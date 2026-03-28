/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: 'var(--color-accent)',
        background: 'var(--color-bg-page)',
        text: 'var(--color-text-main)',
      },
      borderRadius: {
        button: 'var(--radius-button)',
      }
    },
  },
  plugins: [],
}