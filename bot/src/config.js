import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 加载根目录的.env文件
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Minecraft Server Configuration
  minecraft: {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'LLM_Bot',
    version: process.env.MC_VERSION || '1.20.1',
  },

  // Bot Service Configuration
  service: {
    port: parseInt(process.env.BOT_SERVICE_PORT) || 3001,
  },

  // Viewer Configuration (prismarine-viewer)
  viewer: {
    enabled: process.env.VIEWER_ENABLED === 'true',
    port: parseInt(process.env.VIEWER_PORT) || 3007,
    firstPerson: process.env.VIEWER_FIRST_PERSON === 'true',
  },

  // Auto-connect Configuration
  autoConnect: process.env.AUTO_CONNECT === 'true',

  // Debug
  debug: process.env.DEBUG === 'true',
};

export default config;