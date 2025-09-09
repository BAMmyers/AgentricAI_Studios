import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: Use a default import to correctly get the process object.
// The namespace import ('* as ...') was causing a type error because 'cwd' is not on the module namespace.
import nodeProcess from 'process';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  // Load .env file variables.
  // The third argument '' loads all variables, not just VITE_ prefixed ones.
  const env = loadEnv(mode, nodeProcess.cwd(), '');

  return defineConfig({
    plugins: [react()],
    define: {
      // This makes environment variables from your .env file available
      // as process.env.VARIABLE_NAME in your client-side code.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // If you have other variables in .env you want to expose similarly:
      // 'process.env.ANOTHER_KEY': JSON.stringify(env.ANOTHER_KEY),
    }
  });
};