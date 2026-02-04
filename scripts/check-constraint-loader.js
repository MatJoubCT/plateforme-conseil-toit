// Load environment variables BEFORE any imports
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

// Now require the TypeScript script using tsx
require('@esbuild-kit/cjs-loader');
require('./check-constraint-impl.ts');
