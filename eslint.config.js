import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tailwindcss from 'eslint-plugin-tailwindcss';
import prettier from 'eslint-config-prettier';

export default [
	js.configs.recommended,
	{
		files: ['src/**/*.{ts,tsx}'],
		plugins: {
			'@typescript-eslint': tseslint,
		},
		languageOptions: {
			parser: tsparser,
			ecmaVersion: 2021,
			sourceType: 'module',
		},
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-empty': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		plugins: {
			react,
			'react-hooks': reactHooks,
			import: importPlugin,
			'jsx-a11y': jsxA11y,
			tailwindcss,
		},
		settings: {
			react: { version: 'detect' },
			'import/resolver': {
				node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
			},
			tailwindcss: {
				callees: ['classNames', 'clsx', 'cn'],
				config: 'tailwind.config.js',
			},
		},
		rules: {
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'import/order': 'off',

			'tailwindcss/classnames-order': 'warn',
			'tailwindcss/enforces-negative-arbitrary-values': 'warn',
			'tailwindcss/enforces-shorthand': 'warn',
			'tailwindcss/migration-from-tailwind-2': 'warn',
			'tailwindcss/no-arbitrary-value': 'off',
			'tailwindcss/no-custom-classname': 'off',
			'tailwindcss/no-contradicting-classname': 'error',
		},
	},
	prettier,
];
