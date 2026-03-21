"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyStorage = void 0;
exports.encryptKey = encryptKey;
exports.decryptKey = decryptKey;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
/**
 * Encrypted key storage
 * All ratchet keys are encrypted at rest using AES-256-GCM
 * with the master key derived from SECURITY_MASTER_KEY
 */
function masterKey() {
    const source = config_1.SecurityConfig.MASTER_KEY || 'dev-fallback-key-DO-NOT-USE-IN-PRODUCTION';
    return crypto_1.default.createHash('sha256').update(source).digest();
}
/** Encrypt a key for storage in Redis */
function encryptKey(data) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', masterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted.toString('hex'),
    });
}
/** Decrypt a key from Redis storage */
function decryptKey(payload) {
    const parsed = JSON.parse(payload);
    const iv = Buffer.from(parsed.iv, 'hex');
    const tag = Buffer.from(parsed.tag, 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
        decipher.update(Buffer.from(parsed.data, 'hex')),
        decipher.final(),
    ]);
}
/** Key storage helper — wraps Redis operations with encryption */
class KeyStorage {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async store(keyId, key, ttl) {
        const encrypted = encryptKey(key);
        if (ttl) {
            await this.redis.set(keyId, encrypted, 'EX', ttl);
        }
        else {
            await this.redis.set(keyId, encrypted);
        }
    }
    async retrieve(keyId) {
        const raw = await this.redis.get(keyId);
        if (!raw)
            return null;
        return decryptKey(raw);
    }
    async delete(keyId) {
        await this.redis.del(keyId);
    }
    async exists(keyId) {
        return (await this.redis.exists(keyId)) === 1;
    }
}
exports.KeyStorage = KeyStorage;
//# sourceMappingURL=key-storage.js.map