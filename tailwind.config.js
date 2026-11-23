/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ivory: '#FFFCF5',   // page background
        cream: '#F7E9C0',   // brand band (from the class poster)
        gold: {
          DEFAULT: '#C9A24B', // primary buttons
          dark: '#B8913A',    // icons, progress, logo ring
          deep: '#7A5C1C',    // links / gold text on light backgrounds
        },
        ink: '#2E2820',     // main text, dark cards
        muted: '#5A5045',   // secondary text
        line: '#EDE3CC',    // borders
        sand: '#F1EADB',    // inner dividers
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
      },
      maxWidth: {
        page: '70rem',
      },
    },
  },
  plugins: [],
};
