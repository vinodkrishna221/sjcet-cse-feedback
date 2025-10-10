import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    // Bundle optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts', 'chart.js'],
          utils: ['lodash', 'date-fns', 'clsx'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
          state: ['zustand'],
          query: ['@tanstack/react-query'],
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // Compression and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    // Source maps for production debugging
    sourcemap: mode === 'development',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  
  // Server configuration
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    // Enable HMR
    hmr: {
      overlay: true,
    },
  },
  
  // Plugins
  plugins: [
    react({
      // Enable SWC optimizations
      jsxImportSource: '@emotion/react',
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  
  // Path resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'react-hook-form',
      'zod',
      'recharts',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  
  // Environment variables
  define: {
    __DEV__: mode === 'development',
    __PROD__: mode === 'production',
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
}));
