import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aslapp.app',
  appName: 'Learn ASL',
  webDir: 'www',
  server: {
    androidScheme: "http"
  },
};

export default config;
