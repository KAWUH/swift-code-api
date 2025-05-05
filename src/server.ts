import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import swiftCodeRoutes from './routes/swiftCodeRoutes';
import prisma from './utils/prismaClient'; // Import prisma client for graceful shutdown

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Basic Health Check Route
app.get('/', (req: Request, res: Response) => {
  res.send('SWIFT Code Service is running!');
});

// --- API Routes ---
app.use('/v1/swift-codes', swiftCodeRoutes);

// --- Error Handling Middleware --- 
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// --- Server Startup ---
// Start the server only if this file is run directly
if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });

    // Graceful Shutdown Logic
    const gracefulShutdown = async (signal: string) => {
        console.log(`\n[server]: Received ${signal}. Shutting down gracefully...`);
        server.close(async () => {
            console.log('[server]: HTTP server closed.');
            try {
                await prisma.$disconnect();
                console.log('[prisma]: Prisma Client disconnected.');
                process.exit(0);
            } catch (e) {
                console.error('[prisma]: Error disconnecting Prisma Client:', e);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Catches Ctrl+C

}

export default app; // Export for testing purposes