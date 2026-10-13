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
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a8f8',
          500: '#0e8ce4',
          600: '#026fc3',
          700: '#03599e',
          800: '#074c82',
          900: '#0c406c',
        },
        calm: {
          50: '#fbfbfa',
          100: '#f4f4f1',
          200: '#e8e8e3',
          300: '#d7d7cf',
          400: '#bebeb2',
          500: '#9f9f90',
          600: '#7f7f70',
          700: '#646458',
          800: '#4e4e45',
          900: '#2b2b26',
        },
        accent: {
          emerald: '#10b981',
          amber: '#f59e0b',
          violet: '#8b5cf6',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        dyslexic: ['Comic Sans MS', 'Chalkboard SE', 'Verdana', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
