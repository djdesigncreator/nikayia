import 'dotenv/config'; // tem de ser o primeiro import: carrega o .env antes de qualquer módulo ler process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRouter } from '../api/auth/auth.routes';
import { usersRouter } from '../api/users/users.routes';
import { postsRouter } from '../api/posts/posts.routes';
import { commentsRouter } from '../api/comments/comments.routes';
import { reelsRouter } from '../api/reels/reels.routes';
import { storiesRouter } from '../api/stories/stories.routes';
import { livesRouter } from '../api/lives/lives.routes';
import { messagesRouter } from '../api/messages/messages.routes';
import { notificationsRouter } from '../api/notifications/notifications.routes';
import { searchRouter } from '../api/search/search.routes';
import { hashtagsRouter } from '../api/hashtags/hashtags.routes';
import { exploreRouter } from '../api/explore/explore.routes';
import { reportsRouter } from '../api/reports/reports.routes';
import { adminRouter } from '../api/admin/admin.routes';
import { mediaRouter } from '../api/media/media.routes';
import { errorHandler } from '../utils/errorHandler';

const app = express();
app.set('trust proxy', 1); // atrás de um proxy (Render, etc.) o IP real vem no cabeçalho X-Forwarded-For

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Rotas — cada domínio isolado na sua pasta em /api
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api', commentsRouter); // expõe /api/posts/:postId/comments e /api/comments/:id/*
app.use('/api/reels', reelsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/lives', livesRouter);
app.use('/api', messagesRouter); // expõe /api/conversations e /api/messages/:id/seen, conforme API_SPEC.md
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/hashtags', hashtagsRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/media', mediaRouter);

app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' }, error: null }));

// Middleware de erro deve ser o último
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Nikayia backend a correr na porta ${port}`);
});
