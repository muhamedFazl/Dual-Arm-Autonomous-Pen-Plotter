/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    tertiary: 'var(--bg-tertiary)',
                    panel: 'var(--bg-panel)',
                    'panel-hover': 'var(--bg-panel-hover)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                accent: {
                    primary: 'var(--accent-primary)',
                    secondary: 'var(--accent-secondary)',
                    glow: 'var(--accent-glow)',
                    success: 'var(--accent-success)',
                    warning: 'var(--accent-warning)',
                    danger: 'var(--accent-danger)',
                },
                status: {
                    idle: 'var(--status-idle)',
                    run: 'var(--status-run)',
                    hold: 'var(--status-hold)',
                    alarm: 'var(--status-alarm)',
                },
                border: {
                    color: 'var(--border-color)',
                }
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
                display: ['var(--font-display)', 'sans-serif'],
                lcd: ['var(--font-mono)', 'monospace'], // For LCD effect
            }
        },
    },
    plugins: [],
}
