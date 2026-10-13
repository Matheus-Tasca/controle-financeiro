import express from 'express';
import financialRouter from './domains/financial/infra/financial.routes.js';
import authRouter from './domains/auth/infra/auth.routes.js';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { sendInternalError } from './shared/infra/http/errors.js';

const corsOptions = {
  origin: [
    'http://localhost:8087',
    'http://127.0.0.1:8087',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    const trustedProxy = process.env.TRUST_PROXY;
    if (trustedProxy) this.server.set('trust proxy', trustedProxy);
    this.server.use((req, res, next) => {
      req.requestId = randomUUID();
      res.set('X-Request-Id', req.requestId);
      next();
    });
    // Static HTML gets its enforced CSP from NGINX; Swagger receives report-only
    // CSP so its generated inline bootstrap does not break the documentation UI.
    this.server.use(helmet({ contentSecurityPolicy: false }));
    this.server.use(express.json({ limit: '10kb' }));
    this.server.use(cors(corsOptions));
  }

  routes() {
    this.server.get('/health', (req, res) =>
      res.status(200).json({ status: 'ok' })
    );
    this.server.use(
      '/api-docs',
      helmet.contentSecurityPolicy({ reportOnly: true })
    );
    this.server.use('/auth', authRouter);
    this.server.use('/financial', financialRouter);
    this.server.use((error, req, res, next) => {
      if (res.headersSent) return next(error);
      if (error.status === 413) {
        return res.status(413).json({ error: 'Request body too large' });
      }
      if (error.status === 400 && error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      return sendInternalError(req, res, error, 'request.middleware');
    });
  }
}

export default new App().server;
