/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        accent: '#F97316',
        background: '#F8FAFC',
        card: '#FFFFFF',
        success: '#16A34A',
        warning: '#FACC15',
        danger: '#DC2626',
        text: '#1E293B',
        muted: '#64748B',
      },
    },
  },
  plugins: [],
};
