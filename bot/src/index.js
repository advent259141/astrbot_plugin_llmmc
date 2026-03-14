import { BotServer } from './server.js';

/**
 * Main entry point for the Bot Service
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║      LLM-MC Bot Service v0.1.0        ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log('');

  const server = new BotServer();
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    server.stop();
    process.exit(0);
  });

  const port = parseInt(process.env.BOT_SERVICE_PORT) || 3001;
  await server.start(port);
  
  console.log('');
  console.log('💡 Bot service is ready. Use the API to control the bot.');
  console.log('   POST /connect    - Connect to Minecraft server');
  console.log('   POST /action     - Execute an action');
  console.log('   GET  /observation - Get current game state');
  console.log('');
}

main().catch(console.error);