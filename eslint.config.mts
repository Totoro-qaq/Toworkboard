import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json',
						'demo/script.js',
						'scripts/check-repository.mjs',
						'tests/repository.test.mjs',
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['src/main.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
			'obsidianmd/prefer-window-timers': 'off',
			'obsidianmd/settings-tab/prefer-setting-definitions': 'off',
			'obsidianmd/ui/sentence-case': 'off',
		},
	},
	{
		files: ['scripts/**/*.mjs', 'tests/**/*.mjs'],
		rules: {
			'obsidianmd/rule-custom-message': 'off',
		},
	},
);
