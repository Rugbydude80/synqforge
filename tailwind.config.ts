import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        'brand-purple': {
          '50': '#f5f2ff',
          '100': '#ebe6ff',
          '200': '#d6ceff',
          '300': '#b9a9ff',
          '400': '#9b84ff',
          '500': '#7c5cf5',
          '600': '#6b4ae6',
          '700': '#5b3acb',
          '800': '#4c2ea5',
          '900': '#3f2786',
          '950': '#2a1a5e',
        },
        'brand-emerald': {
          '50': '#eefefa',
          '100': '#d6fcf3',
          '200': '#adf8e8',
          '300': '#76eedb',
          '400': '#2dd4bf',
          '500': '#14b8a6',
          '600': '#0d8f82',
          '700': '#0f7667',
          '800': '#115e54',
          '900': '#0f4c45',
          '950': '#072e2b',
        },
        // Pricing tier colors
        'pricing-starter': {
          '50': '#f0fdf4',
          '100': '#dcfce7',
          '500': '#22c55e',
          '600': '#16a34a',
        },
        'pricing-pro': {
          '50': '#eff6ff',
          '100': '#dbeafe',
          '500': '#3b82f6',
          '600': '#2563eb',
        },
        'pricing-team': {
          '50': '#fef3c7',
          '100': '#fde68a',
          '500': '#f59e0b',
          '600': '#d97706',
        },
        'pricing-enterprise': {
          '50': '#fdf4ff',
          '100': '#fae8ff',
          '500': '#d946ef',
          '600': '#c026d3',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'pricing-gradient': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
      },
      boxShadow: {
        'pricing-card': '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
        'pricing-card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
    },
  },
  plugins: [],
  // Safelist pricing colors for dynamic classes
  safelist: [
    {
      pattern: /(bg|text|border)-(green|blue|purple|orange|pink)-(50|100|500|600)/,
    },
  ],
};

export default config;
