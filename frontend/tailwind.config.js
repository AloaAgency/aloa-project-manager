/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aloa': {
          'black': '#0A0A0A',
          'cream': '#FAF6F0',
          'sand': '#F5F0E8',
          'gray': '#787878',
          'white': '#FFFFFF'
        }
      },
      fontFamily: {
        'display': ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'body': ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'mono': ['"SF Mono"', 'Monaco', 'Consolas', 'monospace']
      },
      backgroundImage: {
        'gradient-cream-black': 'linear-gradient(180deg, #FAF6F0 0%, #0A0A0A 100%)',
        'gradient-black-cream': 'linear-gradient(180deg, #0A0A0A 0%, #FAF6F0 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #FAF6F0 0%, #F5F0E8 50%, #FAF6F0 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)'
      },
      animation: {
        'fade-in': 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    }
  },
  plugins: [],
}