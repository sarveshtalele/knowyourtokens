function themeColor(name) {
    return `rgb(var(--color-${name}) / <alpha-value>)`;
}
module.exports = {
    content: ['./src/**/*.{html,ts}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                ink: themeColor('ink'),
                'ink-soft': themeColor('ink-soft'),
                canvas: themeColor('canvas'),
                surface: themeColor('surface'),
                'surface-muted': themeColor('surface-muted'),
                'surface-code': themeColor('surface-code'),
                line: themeColor('line'),
                accent: '#6D5EF7',
                'accent-strong': '#5848E8',
                'accent-soft': themeColor('accent-soft'),
                success: '#0F9D72',
                'success-soft': themeColor('success-soft'),
                warning: '#C27A12',
                'warning-soft': themeColor('warning-soft'),
                danger: '#C53D4B',
                'danger-soft': themeColor('danger-soft'),
                info: '#2878C8',
                'info-soft': themeColor('info-soft'),
                'on-accent': '#FFFFFF',
            },
            borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '18px' },
            fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
            maxWidth: { app: '1440px' },
        },
    },
    plugins: [],
};
