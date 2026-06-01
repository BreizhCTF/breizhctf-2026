import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { extractUser } from './middleware/auth.js';
import pool from './config/database.js';
import authRouter from './routes/auth.js';
import internalRouter from './routes/internal.js';
import { startAutoProcessor } from './jobs/autoProcessor.js';

const app = express();

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/internal', internalRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError) => {
    const message = formattedError.message || 'Une erreur est survenue';
    return { message, locations: formattedError.locations, path: formattedError.path };
  },
});

await apolloServer.start();

app.use(
  '/graphql',
  expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const user = await extractUser(req);
      return { db: pool, user };
    },
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on :${PORT}`);
  console.log(`GraphQL endpoint: http://0.0.0.0:${PORT}/graphql`);
  startAutoProcessor(pool);
});
