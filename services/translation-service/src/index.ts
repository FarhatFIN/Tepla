// ============================================
// Tepla Messenger — Translation Service
// Auto-translate messages to user's language
// Uses LibreTranslate / DeepL / Google Translate API
// Port: 3016
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import {
  KafkaProducer,
  RedisClient,
  createLogger,
  authMiddleware,
  errorHandler,
  AppError,
} from '@tepla/common';
import {
  TranslationRequest,
  TranslationResult,
  SupportedLanguage,
  UserId,
  MessageId,
  ChatId,
  EventTopic,
  EventType,
} from '@tepla/types';

const logger = createLogger('translation-service');
const PORT = 3016;

// Translation API config — supports multiple providers
const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'libretranslate'; // libretranslate | deepl | google
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';

const FREE_DAILY_LIMIT = 5;
const PREMIUM_DAILY_LIMIT = -1; // unlimited
const CACHE_TTL = 86400; // 24h cache for translations

// ─── Translation Providers ─────────────────
async function translateLibre(text: string, source: string, target: string): Promise<string> {
  const resp = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: source === 'auto' ? '' : source,
      target,
      api_key: LIBRETRANSLATE_API_KEY || undefined,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await resp.json() as any;
  if (json.error) throw new Error(json.error);
  return json.translatedText;
}

async function translateDeepL(text: string, source: string, target: string): Promise<string> {
  const params = new URLSearchParams({
    text,
    target_lang: target.toUpperCase(),
    auth_key: DEEPL_API_KEY,
  });
  if (source !== 'auto') params.set('source_lang', source.toUpperCase());

  const resp = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(10000),
  });
  const json = await resp.json() as any;
  return json.translations?.[0]?.text || text;
}

async function translateGoogle(text: string, source: string, target: string): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    target,
    key: GOOGLE_TRANSLATE_API_KEY,
    format: 'text',
  });
  if (source !== 'auto') params.set('source', source);

  const resp = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  const json = await resp.json() as any;
  return json.data?.translations?.[0]?.translatedText || text;
}

async function detectLanguage(text: string): Promise<string> {
  if (TRANSLATION_PROVIDER === 'libretranslate') {
    try {
      const resp = await fetch(`${LIBRETRANSLATE_URL}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, api_key: LIBRETRANSLATE_API_KEY || undefined }),
        signal: AbortSignal.timeout(5000),
      });
      const json = await resp.json() as any;
      return json[0]?.language || 'en';
    } catch { return 'en'; }
  }
  return 'auto';
}

async function translate(text: string, source: string, target: string): Promise<string> {
  switch (TRANSLATION_PROVIDER) {
    case 'deepl': return translateDeepL(text, source, target);
    case 'google': return translateGoogle(text, source, target);
    case 'libretranslate':
    default: return translateLibre(text, source, target);
  }
}

// ─── Service ───────────────────────────────
class TranslationService {
  private app = express();
  private kafka!: KafkaProducer;
  private redis!: RedisClient;

  async start() {
    this.redis = new RedisClient();
    this.kafka = new KafkaProducer('translation-service');

    await Promise.all([this.redis.connect(), this.kafka.connect()]);

    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());

    this.app.get('/health', (_, res) => res.json({ status: 'ok', service: 'translation-service' }));

    // ── Translate text ──
    this.app.post('/api/translate', authMiddleware(), async (req, res, next) => {
      try {
        const userId = req.user!.sub;
        const isPremium = req.user!.isPremium;
        const { text, sourceLang, targetLang, messageId, chatId } = req.body as TranslationRequest;

        if (!text || !targetLang) throw new AppError('text and targetLang required', 400);
        if (text.length > 5000) throw new AppError('Text too long (max 5000 chars)', 400);

        // Check daily limit
        const dailyKey = `translate:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
        const dailyCount = parseInt(await this.redis.get(dailyKey) || '0', 10);
        const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
        if (limit !== -1 && dailyCount >= limit) {
          throw new AppError(`Daily translation limit reached (${limit}). Upgrade to Premium for unlimited.`, 429);
        }

        // Check cache
        const source = sourceLang || 'auto';
        const cacheKey = `translate:cache:${source}:${targetLang}:${crypto.createHash('md5').update(text).digest('hex')}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const result: TranslationResult = JSON.parse(cached);
          res.json({ success: true, data: result });
          return;
        }

        // Detect language if auto
        const detectedSource = source === 'auto' ? await detectLanguage(text) : source;

        // Don't translate if source = target
        if (detectedSource === targetLang) {
          const result: TranslationResult = {
            originalText: text,
            translatedText: text,
            sourceLang: detectedSource,
            targetLang,
            confidence: 1.0,
          };
          res.json({ success: true, data: result });
          return;
        }

        // Translate
        const translatedText = await translate(text, detectedSource, targetLang);

        const result: TranslationResult = {
          originalText: text,
          translatedText,
          sourceLang: detectedSource,
          targetLang,
          confidence: 0.95,
        };

        // Cache result
        await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

        // Increment daily counter
        await this.redis.incr(dailyKey);
        await this.redis.expire(dailyKey, 86400);

        // Emit event
        await this.kafka.send(EventTopic.TRANSLATION_EVENTS, {
          id: crypto.randomUUID(),
          type: EventType.MESSAGE_TRANSLATED,
          topic: EventTopic.TRANSLATION_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'translation-service',
          correlationId: crypto.randomUUID(),
          userId,
          payload: { messageId, chatId, sourceLang: detectedSource, targetLang },
        });

        res.json({ success: true, data: result });
      } catch (err) { next(err); }
    });

    // ── Batch translate (multiple messages) ──
    this.app.post('/api/translate/batch', authMiddleware(), async (req, res, next) => {
      try {
        const userId = req.user!.sub;
        const isPremium = req.user!.isPremium;
        const { messages, targetLang } = req.body as { messages: { id: string; text: string }[]; targetLang: string };

        if (!messages?.length || !targetLang) throw new AppError('messages and targetLang required', 400);
        if (messages.length > 20) throw new AppError('Max 20 messages per batch', 400);

        // Check daily limit
        const dailyKey = `translate:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
        const dailyCount = parseInt(await this.redis.get(dailyKey) || '0', 10);
        const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
        if (limit !== -1 && dailyCount + messages.length > limit) {
          throw new AppError(`Daily limit would be exceeded. ${limit - dailyCount} translations remaining.`, 429);
        }

        const results: Record<string, TranslationResult> = {};

        for (const msg of messages) {
          const cacheKey = `translate:cache:auto:${targetLang}:${crypto.createHash('md5').update(msg.text).digest('hex')}`;
          const cached = await this.redis.get(cacheKey);
          if (cached) {
            results[msg.id] = JSON.parse(cached);
            continue;
          }

          const detectedSource = await detectLanguage(msg.text);
          if (detectedSource === targetLang) {
            results[msg.id] = { originalText: msg.text, translatedText: msg.text, sourceLang: detectedSource, targetLang, confidence: 1.0 };
            continue;
          }

          const translatedText = await translate(msg.text, detectedSource, targetLang);
          const result: TranslationResult = { originalText: msg.text, translatedText, sourceLang: detectedSource, targetLang, confidence: 0.95 };
          results[msg.id] = result;
          await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
        }

        // Increment daily counter
        await this.redis.incrby(dailyKey, messages.length);
        await this.redis.expire(dailyKey, 86400);

        res.json({ success: true, data: results });
      } catch (err) { next(err); }
    });

    // ── Auto-translate settings for a chat ──
    this.app.post('/api/translate/auto', authMiddleware(), async (req, res, next) => {
      try {
        const userId = req.user!.sub;
        const { chatId, enabled, targetLang } = req.body as { chatId: string; enabled: boolean; targetLang?: string };
        const key = `translate:auto:${userId}:${chatId}`;
        if (enabled) {
          await this.redis.set(key, targetLang || 'auto');
        } else {
          await this.redis.del(key);
        }
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Get auto-translate settings ──
    this.app.get('/api/translate/auto/:chatId', authMiddleware(), async (req, res, next) => {
      try {
        const key = `translate:auto:${req.user!.sub}:${req.params.chatId}`;
        const lang = await this.redis.get(key);
        res.json({ success: true, data: { enabled: !!lang, targetLang: lang || null } });
      } catch (err) { next(err); }
    });

    // ── Detect language ──
    this.app.post('/api/translate/detect', authMiddleware(), async (req, res, next) => {
      try {
        const { text } = req.body;
        if (!text) throw new AppError('text required', 400);
        const lang = await detectLanguage(text);
        res.json({ success: true, data: { language: lang } });
      } catch (err) { next(err); }
    });

    // ── Supported languages ──
    this.app.get('/api/translate/languages', (_, res) => {
      const languages: { code: string; name: string }[] = [
        { code: 'en', name: 'English' }, { code: 'ru', name: 'Русский' },
        { code: 'uk', name: 'Українська' }, { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
        { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
        { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' }, { code: 'ar', name: 'العربية' },
        { code: 'hi', name: 'हिन्दी' }, { code: 'tr', name: 'Türkçe' },
        { code: 'pl', name: 'Polski' }, { code: 'nl', name: 'Nederlands' },
        { code: 'sv', name: 'Svenska' }, { code: 'da', name: 'Dansk' },
        { code: 'fi', name: 'Suomi' }, { code: 'no', name: 'Norsk' },
        { code: 'cs', name: 'Čeština' }, { code: 'ro', name: 'Română' },
        { code: 'hu', name: 'Magyar' }, { code: 'el', name: 'Ελληνικά' },
        { code: 'th', name: 'ไทย' }, { code: 'vi', name: 'Tiếng Việt' },
        { code: 'id', name: 'Bahasa Indonesia' }, { code: 'he', name: 'עברית' },
        { code: 'fa', name: 'فارسی' }, { code: 'bg', name: 'Български' },
        { code: 'hr', name: 'Hrvatski' }, { code: 'sk', name: 'Slovenčina' },
        { code: 'sl', name: 'Slovenščina' }, { code: 'et', name: 'Eesti' },
        { code: 'lv', name: 'Latviešu' }, { code: 'lt', name: 'Lietuvių' },
        { code: 'sr', name: 'Српски' }, { code: 'ka', name: 'ქართული' },
        { code: 'az', name: 'Azərbaycan' }, { code: 'kk', name: 'Қазақша' },
        { code: 'uz', name: "O'zbek" }, { code: 'ms', name: 'Bahasa Melayu' },
      ];
      res.json({ success: true, data: languages });
    });

    // ── Translation usage stats ──
    this.app.get('/api/translate/usage', authMiddleware(), async (req, res, next) => {
      try {
        const userId = req.user!.sub;
        const dailyKey = `translate:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
        const used = parseInt(await this.redis.get(dailyKey) || '0', 10);
        const limit = req.user!.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
        res.json({ success: true, data: { used, limit, remaining: limit === -1 ? -1 : Math.max(0, limit - used) } });
      } catch (err) { next(err); }
    });

    this.app.use(errorHandler);
    this.app.listen(PORT, () => logger.info(`Translation service running on port ${PORT}`));
  }
}

new TranslationService().start().catch(err => {
  logger.error('Failed to start service', { error: err.message });
  process.exit(1);
});
