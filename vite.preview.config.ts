import { defineConfig } from 'vite';
export default defineConfig({ build: { outDir: 'dist-preview', target: 'es2021', lib: { entry: 'src/preview.ts', name: 'SlayDownPreview', formats: ['iife'], fileName: () => 'preview.js', cssFileName: 'preview' } } });
