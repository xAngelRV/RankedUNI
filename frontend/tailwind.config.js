/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar dark mode manualmente o usar 'media'
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19',    // Fondo principal
          darker: '#06090F',  // Paneles / tarjetas
          blue: '#1A365D',    // Acentos secundarios
          gold: '#D4AF37',    // Primario / e-sports feel
          light: '#E2E8F0',   // Texto principal
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
