/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    important: '.gf-federated-app',
    corePlugins: {
        // Never re-enable preflight — it resets Shell chrome. Scoped reset lives in src/index.css.
        preflight: false,
    },
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Geist Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            fontSize: {
                xs: ['12px', '16px'],
                sm: ['13px', '18px'],
                base: ['14px', '20px'],
                lg: ['16px', '24px'],
                xl: ['18px', '26px'],
            },
            colors: {
                border: 'hsl(var(--border) / <alpha-value>)',
                background: 'hsl(var(--background) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                card: {
                    DEFAULT: 'hsl(var(--card) / <alpha-value>)',
                    foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
                    foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
                    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
                },
                ring: 'hsl(var(--ring) / <alpha-value>)',
                destructive: 'hsl(var(--destructive) / <alpha-value>)',
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
            },
            boxShadow: {
                none: 'none',
            },
        },
    },
    plugins: [],
};
