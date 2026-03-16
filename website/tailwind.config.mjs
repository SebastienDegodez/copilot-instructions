/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#0288d1', // Main
          600: '#0277bd',
          700: '#01579b', // Dark
          800: '#014c8c',
          900: '#00396b',
        },
        accent: '#ff6f00',
      },
      fontFamily: {
        mono: ["'Fira Code'", 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
