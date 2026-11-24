import type { Config } from 'tailwindcss';

/**
 * The IIMA Marketplace design system.
 *
 * The palette is drawn from IIM Ahmedabad's iconic Louis Kahn red-brick
 * campus: a deep, warm brick red as the primary, a warm off-white ("sand")
 * as the canvas, restrained warm greys for structure, and a single, muted
 * gold reserved for the rarest accents. No bright blue, no gradients.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brick: {
          50: '#FBF3F1',
          100: '#F6E3DE',
          200: '#EBC3BA',
          300: '#DD9C8E',
          400: '#C96B58',
          500: '#B24A36',
          600: '#9A3324', // primary
          700: '#7E2A1F',
          800: '#66241C',
          900: '#4E1E18',
          950: '#2E110D',
        },
        sand: {
          DEFAULT: '#FAF7F2',
          50: '#FDFBF8',
          100: '#FAF7F2',
          200: '#F2ECE3',
          300: '#E7DED1',
        },
        ink: {
          DEFAULT: '#1A1614',
          soft: '#3D3733',
          muted: '#6B6259',
          faint: '#9A9088',
        },
        gold: {
          DEFAULT: '#B08D57',
          soft: '#C9A876',
        },
        line: '#E9E1D6',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,22,20,0.04), 0 8px 24px -12px rgba(26,22,20,0.10)',
        lift: '0 2px 4px rgba(26,22,20,0.05), 0 20px 40px -16px rgba(26,22,20,0.18)',
        subtle: '0 1px 0 rgba(26,22,20,0.04)',
        float: '0 1px 2px rgba(26,22,20,0.06), 0 12px 32px -8px rgba(26,22,20,0.16)',
        nav: '0 -1px 0 rgba(26,22,20,0.06), 0 -8px 24px -12px rgba(26,22,20,0.12)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
