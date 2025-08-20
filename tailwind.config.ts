import type { Config } from 'tailwindcss'

export default {
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				neon: '#00FF88',
				hacker: '#0A0A0A',
			},
			fontFamily: {
				mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
			}
		},
	},
	plugins: [],
} satisfies Config
