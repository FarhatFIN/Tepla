"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoCore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const libsodium_wrappers_1 = __importDefault(require("libsodium-wrappers"));
const config_1 = require("./config");
const audit_logger_1 = require("./audit-logger");
class CryptoCore {
    /** SHA-256 hash */
    static sha256(data) {
        return crypto_1.default.createHash('sha256').update(data).digest();
    }
    /** Generate cryptographic nonce */
    static nonce() {
        return crypto_1.default.randomBytes(config_1.SecurityConfig.NONCE_BYTES).toString('hex');
    }
    /** Generate secure random token */
    static token(bytes = config_1.SecurityConfig.TOKEN_BYTES) {
        return crypto_1.default.randomBytes(bytes).toString('hex');
    }
    /** Generate X25519 key pair via libsodium */
    static generateKeyPair() {
        const kp = libsodium_wrappers_1.default.crypto_box_keypair();
        return {
            publicKey: Buffer.from(kp.publicKey).toString('base64'),
            privateKey: Buffer.from(kp.privateKey).toString('base64'),
        };
    }
    /** Generate signing key pair (Ed25519) */
    static generateSigningKeyPair() {
        const kp = libsodium_wrappers_1.default.crypto_sign_keypair();
        return {
            publicKey: Buffer.from(kp.publicKey).toString('base64'),
            privateKey: Buffer.from(kp.privateKey).toString('base64'),
        };
    }
    /** Derive shared secret from X25519 key exchange */
    static sharedKey(privateKey, publicKey) {
        const priv = Buffer.from(privateKey, 'base64');
        const pub = Buffer.from(publicKey, 'base64');
        const shared = libsodium_wrappers_1.default.crypto_scalarmult(new Uint8Array(priv), new Uint8Array(pub));
        return this.sha256(Buffer.from(shared));
    }
    /** Sign a message with Ed25519 */
    static sign(message, privateKey) {
        const priv = Buffer.from(privateKey, 'base64');
        const sig = libsodium_wrappers_1.default.crypto_sign_detached(new Uint8Array(Buffer.from(message, 'utf8')), new Uint8Array(priv));
        return Buffer.from(sig).toString('base64');
    }
    /** Verify Ed25519 signature */
    static verify(message, signature, publicKey) {
        try {
            const pub = Buffer.from(publicKey, 'base64');
            const sig = Buffer.from(signature, 'base64');
            return libsodium_wrappers_1.default.crypto_sign_verify_detached(new Uint8Array(sig), new Uint8Array(Buffer.from(message, 'utf8')), new Uint8Array(pub));
        }
        catch {
            return false;
        }
    }
    /** AES-256-GCM encryption */
    static encrypt(message, key) {
        const iv = crypto_1.default.randomBytes(12);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([
            cipher.update(message, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            data: encrypted.toString('hex'),
        };
    }
    /** AES-256-GCM decryption with safe error handling */
    static decrypt(payload, key) {
        try {
            const iv = Buffer.from(payload.iv, 'hex');
            const tag = Buffer.from(payload.tag, 'hex');
            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(payload.data, 'hex')),
                decipher.final(),
            ]);
            return decrypted.toString('utf8');
        }
        catch (err) {
            audit_logger_1.AuditLogger.log('decrypt_failed', { error: String(err) });
            return null;
        }
    }
    /** Encrypt a Buffer (for key-at-rest encryption) */
    static encryptBuffer(data, key) {
        const iv = crypto_1.default.randomBytes(12);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            data: encrypted.toString('hex'),
        };
    }
    /** Decrypt a Buffer */
    static decryptBuffer(payload, key) {
        try {
            const iv = Buffer.from(payload.iv, 'hex');
            const tag = Buffer.from(payload.tag, 'hex');
            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([
                decipher.update(Buffer.from(payload.data, 'hex')),
                decipher.final(),
            ]);
        }
        catch {
            return null;
        }
    }
}
exports.CryptoCore = CryptoCore;
//# sourceMappingURL=crypto-core.js.map