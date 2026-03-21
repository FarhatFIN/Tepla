// ============================================
// Tepla Messenger — WebApp Service
// Mini Apps platform (Telegram WebApp-style)
// Port: 3017
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import {
  BaseRepository,
  RedisClient,
  createLogger,
  authMiddleware,
  errorHandler,
  AppError,
} from '@tepla/common';
import {
  WebAppId,
  WebApp,
  WebAppCategory,
  WebAppPermission,
  BotId,
  UserId,
  PaymentInvoice,
  StoreItem,
  ChatId,
} from '@tepla/types';

const logger = createLogger('webapp-service');
const PORT = 3017;

// ─── Repository ────────────────────────────
class WebAppRepository extends BaseRepository {
  async create(app: WebApp): Promise<WebApp> {
    await this.execute(
      `INSERT INTO webapps (id, developer_id, bot_id, name, short_name, description, icon_url,
        url, category, screenshots, is_published, is_premium_only, permissions, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,
      [app.id, app.developerId, app.botId, app.name, app.shortName, app.description,
       app.iconUrl, app.url, app.category, JSON.stringify(app.screenshots),
       app.isPublished, app.isPremiumOnly, JSON.stringify(app.permissions)]
    );
    return app;
  }

  async findById(id: WebAppId): Promise<WebApp | null> {
    const row = await this.queryOne<any>(`SELECT * FROM webapps WHERE id = $1`, [id]);
    return row ? this.mapApp(row) : null;
  }

  async findByShortName(shortName: string): Promise<WebApp | null> {
    const row = await this.queryOne<any>(`SELECT * FROM webapps WHERE short_name = $1`, [shortName]);
    return row ? this.mapApp(row) : null;
  }

  async getPublished(category?: string, limit = 50, offset = 0): Promise<WebApp[]> {
    let query = `SELECT * FROM webapps WHERE is_published = true`;
    const params: any[] = [];
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    params.push(limit, offset);
    query += ` ORDER BY install_count DESC, rating DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const rows = await this.queryMany<any>(query, params);
    return rows.map(r => this.mapApp(r));
  }

  async search(q: string, limit = 20): Promise<WebApp[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM webapps WHERE is_published = true AND (name ILIKE $1 OR description ILIKE $1)
       ORDER BY install_count DESC LIMIT $2`,
      [`%${q}%`, limit]
    );
    return rows.map(r => this.mapApp(r));
  }

  async getByDeveloper(userId: UserId): Promise<WebApp[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM webapps WHERE developer_id = $1 ORDER BY created_at DESC`, [userId]
    );
    return rows.map(r => this.mapApp(r));
  }

  async update(id: WebAppId, fields: Partial<WebApp>): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (fields.name !== undefined) { sets.push(`name = $${i++}`); vals.push(fields.name); }
    if (fields.description !== undefined) { sets.push(`description = $${i++}`); vals.push(fields.description); }
    if (fields.url !== undefined) { sets.push(`url = $${i++}`); vals.push(fields.url); }
    if (fields.iconUrl !== undefined) { sets.push(`icon_url = $${i++}`); vals.push(fields.iconUrl); }
    if (fields.category !== undefined) { sets.push(`category = $${i++}`); vals.push(fields.category); }
    if (fields.screenshots !== undefined) { sets.push(`screenshots = $${i++}`); vals.push(JSON.stringify(fields.screenshots)); }
    if (fields.isPublished !== undefined) { sets.push(`is_published = $${i++}`); vals.push(fields.isPublished); }
    if (fields.isPremiumOnly !== undefined) { sets.push(`is_premium_only = $${i++}`); vals.push(fields.isPremiumOnly); }
    if (fields.permissions !== undefined) { sets.push(`permissions = $${i++}`); vals.push(JSON.stringify(fields.permissions)); }
    if (sets.length === 0) return;
    vals.push(id);
    await this.execute(`UPDATE webapps SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  }

  async delete(id: WebAppId): Promise<void> {
    await this.execute(`DELETE FROM webapps WHERE id = $1`, [id]);
  }

  async incrementInstall(id: WebAppId): Promise<void> {
    await this.execute(`UPDATE webapps SET install_count = install_count + 1 WHERE id = $1`, [id]);
  }

  async rate(webappId: WebAppId, userId: UserId, score: number): Promise<void> {
    await this.execute(
      `INSERT INTO webapp_ratings (webapp_id, user_id, score, created_at) VALUES ($1,$2,$3,NOW())
       ON CONFLICT (webapp_id, user_id) DO UPDATE SET score = $3`,
      [webappId, userId, score]
    );
    // Update average rating
    const avg = await this.queryOne<{ avg: string }>(
      `SELECT AVG(score)::numeric(3,2) as avg FROM webapp_ratings WHERE webapp_id = $1`, [webappId]
    );
    await this.execute(`UPDATE webapps SET rating = $1 WHERE id = $2`, [parseFloat(avg?.avg || '0'), webappId]);
  }

  private mapApp(row: any): WebApp {
    return {
      id: row.id as WebAppId,
      developerId: row.developer_id as UserId,
      botId: row.bot_id as BotId | null,
      name: row.name,
      shortName: row.short_name,
      description: row.description,
      iconUrl: row.icon_url,
      url: row.url,
      category: row.category as WebAppCategory,
      screenshots: row.screenshots || [],
      isPublished: row.is_published,
      isPremiumOnly: row.is_premium_only,
      installCount: row.install_count || 0,
      rating: parseFloat(row.rating) || 0,
      permissions: row.permissions || [],
      createdAt: row.created_at,
    };
  }
}

// ─── Payments Repository ───────────────────
class PaymentRepository extends BaseRepository {
  async createInvoice(invoice: PaymentInvoice): Promise<PaymentInvoice> {
    await this.execute(
      `INSERT INTO payment_invoices (id, bot_id, chat_id, user_id, title, description, amount, currency, payload, provider, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [invoice.id, invoice.botId, invoice.chatId, invoice.userId, invoice.title,
       invoice.description, invoice.amount, invoice.currency, invoice.payload, invoice.provider, invoice.status]
    );
    return invoice;
  }

  async getInvoice(id: string): Promise<PaymentInvoice | null> {
    const row = await this.queryOne<any>(`SELECT * FROM payment_invoices WHERE id = $1`, [id]);
    if (!row) return null;
    return {
      id: row.id,
      botId: row.bot_id,
      chatId: row.chat_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
      payload: row.payload,
      provider: row.provider,
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    };
  }

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    const extra = status === 'paid' ? ', paid_at = NOW()' : '';
    await this.execute(`UPDATE payment_invoices SET status = $1${extra} WHERE id = $2`, [status, id]);
  }
}

// ─── Store Repository ──────────────────────
class StoreRepository extends BaseRepository {
  async createItem(item: StoreItem): Promise<StoreItem> {
    await this.execute(
      `INSERT INTO store_items (id, chat_id, seller_id, title, description, price, currency, image_url, category, stock, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [item.id, item.chatId, item.sellerId, item.title, item.description, item.price,
       item.currency, item.imageUrl, item.category, item.stock, item.isActive]
    );
    return item;
  }

  async getByChat(chatId: ChatId, limit = 50): Promise<StoreItem[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM store_items WHERE chat_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT $2`,
      [chatId, limit]
    );
    return rows.map(r => ({
      id: r.id, chatId: r.chat_id, sellerId: r.seller_id, title: r.title,
      description: r.description, price: r.price, currency: r.currency,
      imageUrl: r.image_url, category: r.category, stock: r.stock,
      isActive: r.is_active, createdAt: r.created_at,
    }));
  }
}

// ─── Service ───────────────────────────────
class WebAppService {
  private app = express();
  private webappRepo!: WebAppRepository;
  private paymentRepo!: PaymentRepository;
  private storeRepo!: StoreRepository;
  private redis!: RedisClient;

  async start() {
    this.redis = new RedisClient();
    this.webappRepo = new WebAppRepository();
    this.paymentRepo = new PaymentRepository();
    this.storeRepo = new StoreRepository();

    await this.redis.connect();

    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());

    this.app.get('/health', (_, res) => res.json({ status: 'ok', service: 'webapp-service' }));

    // ── Developer: Create webapp ──
    this.app.post('/api/webapps', authMiddleware(), async (req, res, next) => {
      try {
        const { name, shortName, description, url, category, botId, isPremiumOnly, permissions } = req.body;
        const existing = await this.webappRepo.findByShortName(shortName);
        if (existing) throw new AppError('Short name already taken', 409);

        const webapp = await this.webappRepo.create({
          id: crypto.randomUUID() as WebAppId,
          developerId: req.user!.sub,
          botId: botId || null,
          name, shortName,
          description: description || null,
          iconUrl: null,
          url,
          category: category || WebAppCategory.OTHER,
          screenshots: [],
          isPublished: false,
          isPremiumOnly: isPremiumOnly || false,
          installCount: 0,
          rating: 0,
          permissions: permissions || [],
          createdAt: new Date().toISOString(),
        });
        res.status(201).json({ success: true, data: webapp });
      } catch (err) { next(err); }
    });

    // ── Browse apps ──
    this.app.get('/api/webapps', async (req, res, next) => {
      try {
        const { category, limit, offset } = req.query;
        const apps = await this.webappRepo.getPublished(
          category as string, parseInt(limit as string) || 50, parseInt(offset as string) || 0
        );
        res.json({ success: true, data: apps });
      } catch (err) { next(err); }
    });

    // ── Search apps ──
    this.app.get('/api/webapps/search', async (req, res, next) => {
      try {
        const apps = await this.webappRepo.search(req.query.q as string || '');
        res.json({ success: true, data: apps });
      } catch (err) { next(err); }
    });

    // ── Get app ──
    this.app.get('/api/webapps/:id', async (req, res, next) => {
      try {
        const app = await this.webappRepo.findById(req.params.id as WebAppId)
          || await this.webappRepo.findByShortName(req.params.id);
        if (!app) throw new AppError('Not found', 404);
        res.json({ success: true, data: app });
      } catch (err) { next(err); }
    });

    // ── Update app ──
    this.app.patch('/api/webapps/:id', authMiddleware(), async (req, res, next) => {
      try {
        const app = await this.webappRepo.findById(req.params.id as WebAppId);
        if (!app || app.developerId !== req.user!.sub) throw new AppError('Not found', 404);
        await this.webappRepo.update(app.id, req.body);
        res.json({ success: true, data: await this.webappRepo.findById(app.id) });
      } catch (err) { next(err); }
    });

    // ── Delete app ──
    this.app.delete('/api/webapps/:id', authMiddleware(), async (req, res, next) => {
      try {
        const app = await this.webappRepo.findById(req.params.id as WebAppId);
        if (!app || app.developerId !== req.user!.sub) throw new AppError('Not found', 404);
        await this.webappRepo.delete(app.id);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Rate app ──
    this.app.post('/api/webapps/:id/rate', authMiddleware(), async (req, res, next) => {
      try {
        const { score } = req.body;
        if (score < 1 || score > 5) throw new AppError('Score must be 1-5', 400);
        await this.webappRepo.rate(req.params.id as WebAppId, req.user!.sub, score);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Open app (increment install + generate init data) ──
    this.app.post('/api/webapps/:id/open', authMiddleware(), async (req, res, next) => {
      try {
        const app = await this.webappRepo.findById(req.params.id as WebAppId);
        if (!app) throw new AppError('Not found', 404);
        if (app.isPremiumOnly && !req.user!.isPremium) throw new AppError('Premium required', 403);

        await this.webappRepo.incrementInstall(app.id);

        // Generate WebApp init data (similar to Telegram's initData)
        const initData = {
          query_id: crypto.randomUUID(),
          user: {
            id: req.user!.sub,
            username: req.user!.username,
            is_premium: req.user!.isPremium,
          },
          auth_date: Math.floor(Date.now() / 1000),
          hash: crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
            .update(`${req.user!.sub}:${app.id}:${Date.now()}`)
            .digest('hex'),
        };

        res.json({ success: true, data: { webapp: app, initData } });
      } catch (err) { next(err); }
    });

    // ── My apps (developer) ──
    this.app.get('/api/webapps/developer/my', authMiddleware(), async (req, res, next) => {
      try {
        const apps = await this.webappRepo.getByDeveloper(req.user!.sub);
        res.json({ success: true, data: apps });
      } catch (err) { next(err); }
    });

    // ── Payments: Create invoice ──
    this.app.post('/api/payments/invoice', authMiddleware(), async (req, res, next) => {
      try {
        const { title, description, amount, currency, payload, provider, chatId, botId } = req.body;
        const invoice = await this.paymentRepo.createInvoice({
          id: crypto.randomUUID(),
          botId: botId || null,
          chatId,
          userId: req.user!.sub,
          title, description,
          amount: parseFloat(amount),
          currency: currency || 'USD',
          payload: payload || '',
          provider: provider || 'sparks',
          status: 'pending',
          createdAt: new Date().toISOString(),
          paidAt: null,
        });
        res.status(201).json({ success: true, data: invoice });
      } catch (err) { next(err); }
    });

    // ── Payments: Confirm payment ──
    this.app.post('/api/payments/invoice/:id/pay', authMiddleware(), async (req, res, next) => {
      try {
        const invoice = await this.paymentRepo.getInvoice(req.params.id);
        if (!invoice || invoice.userId !== req.user!.sub) throw new AppError('Not found', 404);
        if (invoice.status !== 'pending') throw new AppError('Invoice already processed', 400);
        await this.paymentRepo.updateInvoiceStatus(invoice.id, 'paid');
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Store: Create item ──
    this.app.post('/api/store/items', authMiddleware(), async (req, res, next) => {
      try {
        const { chatId, title, description, price, currency, imageUrl, category, stock } = req.body;
        const item = await this.storeRepo.createItem({
          id: crypto.randomUUID(),
          chatId, sellerId: req.user!.sub,
          title, description,
          price: parseFloat(price),
          currency: currency || 'USD',
          imageUrl: imageUrl || null,
          category: category || 'general',
          stock: stock || null,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        res.status(201).json({ success: true, data: item });
      } catch (err) { next(err); }
    });

    // ── Store: Get items in chat ──
    this.app.get('/api/store/chat/:chatId', async (req, res, next) => {
      try {
        const items = await this.storeRepo.getByChat(req.params.chatId as ChatId);
        res.json({ success: true, data: items });
      } catch (err) { next(err); }
    });

    this.app.use(errorHandler);
    this.app.listen(PORT, () => logger.info(`WebApp service running on port ${PORT}`));
  }
}

new WebAppService().start().catch(err => {
  logger.error('Failed to start service', { error: err.message });
  process.exit(1);
});
