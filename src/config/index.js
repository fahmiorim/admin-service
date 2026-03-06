import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.ADMIN_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:4000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  },
  logging: { level: process.env.LOG_LEVEL || 'info' },
  database: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  },
  adminApiKey: process.env.ADMIN_API_KEY,
  internalDocsPath: process.env.INTERNAL_DOCS_PATH || '/internal-ref-change-me'
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction   = config.nodeEnv === 'production';
