/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          start: "#6C63FF",
          end: "#4C6EF5",
          DEFAULT: "#6C63FF",
        },
        accent: {
          purple: "#7C3AED",
          DEFAULT: "#7C3AED",
        },
        brand: {
          DEFAULT: "#6C63FF",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6C63FF 0%, #4C6EF5 100%)',
        'gradient-accent': 'linear-gradient(135deg, #7C3AED 0%, #6C63FF 100%)',
        'gradient-hero': 'radial-gradient(circle at 20% 50%, rgba(108, 99, 255, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(76, 110, 245, 0.06) 0%, transparent 50%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-up-delay': 'fadeInUp 0.6s ease-out 0.1s forwards',
        'stagger': 'fadeInUp 0.6s ease-out var(--delay) forwards',
        'hover-float': 'hoverFloat 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.4s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        hoverFloat: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        glow: {
          '0%': {
            boxShadow: '0 0 20px rgba(108, 99, 255, 0.3)',
          },
          '100%': {
            boxShadow: '0 0 30px rgba(108, 99, 255, 0.6)',
          },
        },
        slideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 24px rgba(108, 99, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(108, 99, 255, 0.4)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card': '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 20px 40px -5px rgba(0, 0, 0, 0.1), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
}

