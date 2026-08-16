import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { router } from './routes/conversions.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'pocket-pdf-api' }));
app.use('/api/conversions', router);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err); res.status(500).json({ error: err.message || 'Conversion failed.' });
});
app.listen(Number(process.env.PORT ?? 4000), () => console.log('Pocket PDF API running'));
