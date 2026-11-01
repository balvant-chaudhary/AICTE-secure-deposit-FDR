/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#003049',
          navyDark:'#001e30',
          navyMid: '#00406a',
          red:     '#D62828',
          redLight:'#e84545',
          bhagwa:  '#F77F00',
          bhagwaLight: '#FF9A2E',
          golden:  '#FCBF49',
          cream:   '#EAE2B7',
          creamLight: '#F8F6EF',
          // Semantic supporting colors
          success: '#16865C',
          successLight: '#D1FAE5',
          muted:   '#64748B',
          border:  '#E2E8F0',
          surface: '#F8F6EF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 48, 73, 0.10)',
        'glow-bhagwa': '0 0 25px -5px rgba(247, 127, 0, 0.35)',
        'glow-navy': '0 0 25px -5px rgba(0, 48, 73, 0.30)',
        'card': '0 2px 12px rgba(0,48,73,0.08)',
        'card-hover': '0 6px 24px rgba(0,48,73,0.15)',
      },
      backgroundImage: {
        'bhagwa-gradient': 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)',
        'navy-gradient':   'linear-gradient(135deg, #003049 0%, #00406a 100%)',
        'hero-gradient':   'linear-gradient(135deg, #001e30 0%, #003049 40%, #00406a 100%)',
        'warm-gradient':   'linear-gradient(135deg, #EAE2B7 0%, #F8F6EF 100%)',
      },
    },
  },
  plugins: [],
}
