/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        success: '#16a34a',
        danger: '#dc2626',
        surface: '#f8fafc',
        border: '#e2e8f0',
        'text-main': '#1e293b',
        muted: '#64748b',
      },
    },
  },
  plugins: [],
}
