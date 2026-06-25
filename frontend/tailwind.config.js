/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // geliyo brand: red / white / black, kept harmonious and easy on the eyes.
        primary: '#1A1A1A', // near-black: sidebar, headings
        accent: '#E11414', // geliyo red: brand, primary actions, active nav
        background: '#F8FAFC',
        card: '#FFFFFF',
        success: '#16A34A',
        warning: '#FACC15',
        danger: '#991B1B', // deeper red for destructive actions (distinct from brand)
        text: '#1F2937',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
