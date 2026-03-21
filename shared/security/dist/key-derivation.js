"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyDerivation = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * HKDF-based key derivation
 * Uses correct parameter order: (ikm, salt)
 * Info field provides domain separation between derived keys
 */
class KeyDerivation {
    /** Standard HKDF derive with tepla context */
    static derive(ikm, salt, info = 'tepla_secure_key') {
        return Buffer.from(crypto_1.default.hkdfSync('sha256', ikm, salt, Buffer.from(info), 32));
    }
    /** Derive message encryption key */
    static deriveMessageKey(sharedSecret, chatId, messageIndex) {
        const salt = Buffer.from(`${chatId}:${messageIndex}`);
        return this.derive(sharedSecret, salt, 'tepla_message_key');
    }
    /** Derive session key from master key */
    static deriveSessionKey(masterKey, sessionId) {
        const salt = Buffer.from(sessionId);
        return this.derive(masterKey, salt, 'tepla_session_key');
    }
    /** Derive storage encryption key (for encrypting keys at rest) */
    static deriveStorageKey(masterKey, keyId) {
        const salt = Buffer.from(keyId);
        return this.derive(masterKey, salt, 'tepla_storage_key');
    }
    /** Derive auth token key */
    static deriveAuthKey(masterKey, userId) {
        const salt = Buffer.from(userId);
        return this.derive(masterKey, salt, 'tepla_auth_key');
    }
}
exports.KeyDerivation = KeyDerivation;
//# sourceMappingURL=key-derivation.js.map