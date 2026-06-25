/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // geliyo brand: red / white / black, with red as the dominant UI color.
        primary: '#E4150F', // geliyo red: sidebar, headings, strong actions
        accent: '#E4150F', // geliyo red: brand, primary actions, active nav
        background: '#FFECEB',
        card: '#FFFCFC',
        success: '#16A34A',
        warning: '#FACC15',
        danger: '#B42318', // destructive red, kept distinct from the brand red
        text: '#1F2937',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
