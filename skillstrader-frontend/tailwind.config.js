export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffef5',
          100: '#fffdeb',
          200: '#fffad0',
          300: '#fff7b3',
          400: '#ffeb78',
          500: '#ffc107',
          600: '#ffb300',
          700: '#f7941d',
          800: '#e68a00',
          900: '#b86a00',
        },
        navy: {
          50: '#f0f4ff',
          100: '#dde8ff',
          200: '#bbd2ff',
          300: '#8fb3ff',
          400: '#5d88ff',
          500: '#0047ab',
          600: '#003d8f',
          700: '#003476',
          800: '#002a5a',
          900: '#001e3d',
        },
        accent: {
          50: '#fef5f5',
          100: '#fee0e0',
          200: '#fcc2c2',
          300: '#f99a9a',
          400: '#f56767',
          500: '#dc3545',
          600: '#c82333',
          700: '#a91d2a',
          800: '#8a1821',
          900: '#6e141a',
        },
      },
      backgroundColor: {
        'bg': 'var(--bg)',
        'surface': 'var(--surface)',
        'surface2': 'var(--surface2)',
      },
      textColor: {
        'text': 'var(--text)',
        'muted': 'var(--muted)',
      },
      borderColor: {
        'border': 'var(--border)',
      },
      boxShadow: {
        'shadow': 'var(--shadow)',
      },
    },
  },
  plugins: [],
};