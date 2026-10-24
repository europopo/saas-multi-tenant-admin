import type { Config } from 'tailwindcss';
import baseConfig from '../../packages/config/tailwind.config';

export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx}',
    '../../packages/ui/src/**/*.{vue,ts}',
    '../../packages/layouts/src/**/*.{vue,ts}',
  ],
} satisfies Config;
