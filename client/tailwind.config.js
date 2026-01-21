/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3B82F6', // Blue-500
                    dark: '#2563EB',    // Blue-600
                    light: '#60A5FA',   // Blue-400
                    50: '#EFF6FF',
                    100: '#DBEAFE',
                },
                secondary: {
                    DEFAULT: '#64748B', // Slate-500
                    dark: '#475569',    // Slate-600
                    light: '#94A3B8'    // Slate-400
                },
                success: '#10B981', // Emerald-500
                warning: '#F59E0B', // Amber-500
                danger: '#EF4444',  // Red-500
                dark: '#0F172A',    // Slate-900
                light: '#F8FAFC'    // Slate-50
            },
            fontFamily: {
                sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
