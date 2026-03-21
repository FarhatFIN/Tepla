"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSecurity = initializeSecurity;
const libsodium_wrappers_1 = __importDefault(require("libsodium-wrappers"));
const common_1 = require("@tepla/common");
const config_1 = require("./config");
const logger = (0, common_1.createLogger)('security-init');
let initialized = false;
async function initializeSecurity() {
    if (initialized)
        return;
    await libsodium_wrappers_1.default.ready;
    // Validate critical config
    if (!config_1.SecurityConfig.MASTER_KEY && process.env.NODE_ENV === 'production') {
        logger.error('SECURITY_MASTER_KEY is not set! Encrypted key storage will fail.');
        throw new Error('SECURITY_MASTER_KEY environment variable is required in production');
    }
    if (!config_1.SecurityConfig.MASTER_KEY) {
        logger.warn('SECURITY_MASTER_KEY not set — using dev fallback. DO NOT use in production!');
    }
    initialized = true;
    logger.info('Security framework initialized', {
        sessionTtl: config_1.SecurityConfig.SESSION_TTL,
        rateLimitWindow: config_1.SecurityConfig.RATE_LIMIT_WINDOW,
        nonceTtl: config_1.SecurityConfig.NONCE_TTL,
    });
}
//# sourceMappingURL=init.js.map