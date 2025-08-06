import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.darksoi.greenlight',
  appName: 'greenlight-app',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true
  }
};

export default config;
