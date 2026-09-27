import { env } from './config/env';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import auditLogRoutes from './routes/auditLogRoutes';
import authRoutes from './routes/authRoutes';
import billRoutes from './routes/billRoutes';
import budgetRoutes from './routes/budgetRoutes';
import categoryRoutes from './routes/categoryRoutes';
import choreRoutes from './routes/choreRoutes';
import commentRoutes from './routes/commentRoutes';
import healthRoutes from './routes/healthRoutes';
import householdRoutes from './routes/householdRoutes';
import notificationRoutes from './routes/notificationRoutes';
import shoppingRoutes from './routes/shoppingRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';
import { generalDbRateLimiter } from './middleware/dbRateLimiter';
import { metricsHandler, metricsMiddleware } from './middleware/metricsMiddleware';
import type {} from './types/express';

const app = express();

// Behind a proxy every request would otherwise share the proxy's IP and one rate-limit bucket.
app.set('trust proxy', env.TRUST_PROXY);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
// Before the logger and the rate limiter: a scrape every 15s would flood the logs and RateLimitEntry.
app.get('/metrics', metricsHandler);
app.use(metricsMiddleware);
app.use(
  pinoHttp({
    logger,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[Redacted]',
    },
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(generalDbRateLimiter);
app.use(healthRoutes);
app.use(authRoutes);
app.use(householdRoutes);
app.use(userRoutes);
app.use(categoryRoutes);
app.use(budgetRoutes);
app.use(transactionRoutes);
app.use(billRoutes);
app.use(choreRoutes);
app.use(shoppingRoutes);
app.use(commentRoutes);
app.use(notificationRoutes);
app.use(auditLogRoutes);
app.use(errorMiddleware);

export default app;
