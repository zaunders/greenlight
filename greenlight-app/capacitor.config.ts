import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.darksoil.greenlight',
  appName: 'Greenlight',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, using the dev server:
    url: 'http://localhost:3000'
  }
};

export default config;
