/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte Salon de la Danse d'Angers
        brand: {
          DEFAULT: '#7A291E', // terracotta signature
          dark: '#5E1E15',
          600: '#8F3222',
          50: '#F7ECE9',
        },
        accent: '#2EA3F2', // bleu secondaire
        paper: '#FCF2F0', // fond rosé très clair (maquettes Stitch)
        ink: '#2A2724',
        muted: '#6B6560',
        line: '#EAE3DF',
        // Sémantique jauge
        ok: '#2E7D46',
        okbg: '#E7F2EB',
        warn: '#B5701A',
        warnbg: '#FBEFDD',
        full: '#8B8480',
      },
      fontFamily: {
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,39,36,.04), 0 8px 24px -18px rgba(42,39,36,.35)',
      },
    },
  },
  plugins: [],
};
