import type { ToolConfig } from '@itsjust/core';

export const toolConfig = {
  id: 'password-strength-checker',
  name: 'Password Strength Checker',
  description:
    'Estimate password strength with entropy math, crack-time estimates, pattern detection, and breach-style rule feedback, entirely client-side.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSubtle: 'rgba(124, 58, 237, 0.08)',
    brand: 'Password Strength Checker',
    icon: '🔐',
  },
  shortcuts: [
    {
      title: 'Password Strength Checker',
      shortcuts: [
        {
          keys: 'Mod+Shift+C',
          label: 'Copy report',
          description: 'copy the text summary report to the clipboard',
        },
        {
          keys: 'Mod+Shift+R',
          label: 'Generate password',
          description: 'fill the input with a strong random password',
        },
        {
          keys: 'Mod+Shift+X',
          label: 'Clear',
          description: 'clear the password input',
        },
        {
          keys: 'Mod+Shift+A',
          label: 'Toggle reveal',
          description: 'show or hide the password text',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
