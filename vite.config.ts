import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	build: {
		minify: 'terser',
		sourcemap: false,
		rollupOptions: {
			input: 'index.html',
		},
	},
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ['**/src-tauri/**'],
		},
	},
	plugins: [react()],
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
});
