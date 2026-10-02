import type { Config } from 'tailwindcss';

function themeColor(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
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
        'accent-text': themeColor('accent-text'),
        'accent-soft': themeColor('accent-soft'),
        success: '#0F9D72',
        'success-soft': themeColor('success-soft'),
        'success-text': themeColor('success-text'),
        warning: '#C27A12',
        'warning-soft': themeColor('warning-soft'),
        'warning-text': themeColor('warning-text'),
        danger: '#C53D4B',
        'danger-soft': themeColor('danger-soft'),
        'danger-text': themeColor('danger-text'),
        info: '#2878C8',
        'info-soft': themeColor('info-soft'),
        'info-text': themeColor('info-text'),
        'on-accent': '#FFFFFF',
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '18px' },
      fontFamily: { sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      maxWidth: { app: '1440px' },
    },
  },
  plugins: [],
} satisfies Config;
