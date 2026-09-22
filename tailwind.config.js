import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      spacing: {
        'recommended-question-block': '0.8125rem',
        7.5: '1.875rem',
        'sidebar-tab-label-inset': '0.57775rem',
      },
      width: {
        'sidebar-tabs': '12.5rem',
        'sidebar-tab': '54.622%',
      },
      maxWidth: {
        'recommended-question': '26.875rem',
      },
      lineHeight: {
        'recommended-question': '1.375rem',
      },
      inset: {
        'sidebar-tab-offset': '45.378%',
      },
      boxShadow: {
        'sidebar-tab':
          '0 2px 5px 0 rgb(0 0 0 / 0.05), 0 -2px 5px 0 rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        'chat-composer': {
          DEFAULT: colors.white,
          dark: '#303030',
        },
        comment: {
          DEFAULT: colors.yellow[400],
          surface: colors.yellow[200],
          'surface-dark': '#f0b62240',
          resolved: 'var(--tt-selection-color, rgba(0, 144, 255, 0.2))',
          'resolved-dark': 'var(--tt-selection-color, rgba(61, 168, 255, 0.2))',
          'success-surface': '#e7f3ef',
          'success-foreground': '#28715b',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
          tab: 'hsl(var(--sidebar-tab-background))',
          'tab-active': 'hsl(var(--sidebar-tab-active))',
          'tab-border': 'hsl(var(--sidebar-tab-border))',
          'tab-foreground': 'hsl(var(--sidebar-tab-foreground))',
          'tab-active-foreground': 'hsl(var(--sidebar-tab-active-foreground))',
        },
      },
      keyframes: {
        'cat-blink': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '40%': { transform: 'scaleY(0.08)' },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'blink-caret': {
          '0%, 100%': {
            opacity: '0',
          },
          '50%': {
            opacity: '1',
          },
        },
      },
      animation: {
        'cat-blink-on-press': 'cat-blink 170ms linear',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'blink-caret': 'blink-caret 1s step-end infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    function ({ addVariant, addComponents }) {
      addComponents({
        '.border-line': {
          '@apply rounded-md border border-neutral-200 bg-transparent dark:border-neutral-700 dark:bg-transparent':
            {},
        },
      });
      addVariant('standalone', '@media (display-mode: standalone)');
    },
  ],
};
