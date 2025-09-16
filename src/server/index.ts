#!/usr/bin/env node

/**
 * Claudette HTTP Server Entry Point
 * Production-ready HTTP server for Claudette AI Middleware
 */

import { ClaudetteHttpServer } from './http-server';

async function main() {
  const port = parseInt(process.env.PORT || '3000');
  
  console.log('🚀 Starting Claudette HTTP Server...');
  console.log(`   Port: ${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL || 'info'}`);

  const server = new ClaudetteHttpServer(port);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    
    try {
      await server.stop();
      console.log('✅ Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled rejections and exceptions
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, log and continue
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // For uncaught exceptions, we should exit
    process.exit(1);
  });

  try {
    await server.start();
    console.log('✅ Claudette HTTP Server started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Startup error:', error);
    process.exit(1);
  });
}

export { ClaudetteHttpServer };