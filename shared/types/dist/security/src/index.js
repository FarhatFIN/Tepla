"use strict";
// ═══════════════════════════════════════════════════════
// Tepla Messenger — Security Framework v2.0
// Microservice-ready: E2E encryption, Double Ratchet,
// replay protection, device security, audit, metrics
// ═══════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSecurity = exports.SecurityMiddleware = exports.MessagePipeline = exports.socketMessageRateLimit = exports.socketSecurity = exports.SecurityMetrics = exports.AuditLogger = exports.DeviceSecurity = exports.SecurityRateLimiter = exports.ReplayProtection = exports.SessionManager = exports.DoubleRatchet = exports.decryptKey = exports.encryptKey = exports.KeyStorage = exports.KeyDerivation = exports.CryptoCore = exports.SecurityConfig = void 0;
var config_1 = require("./config");
Object.defineProperty(exports, "SecurityConfig", { enumerable: true, get: function () { return config_1.SecurityConfig; } });
var crypto_core_1 = require("./crypto-core");
Object.defineProperty(exports, "CryptoCore", { enumerable: true, get: function () { return crypto_core_1.CryptoCore; } });
var key_derivation_1 = require("./key-derivation");
Object.defineProperty(exports, "KeyDerivation", { enumerable: true, get: function () { return key_derivation_1.KeyDerivation; } });
var key_storage_1 = require("./key-storage");
Object.defineProperty(exports, "KeyStorage", { enumerable: true, get: function () { return key_storage_1.KeyStorage; } });
Object.defineProperty(exports, "encryptKey", { enumerable: true, get: function () { return key_storage_1.encryptKey; } });
Object.defineProperty(exports, "decryptKey", { enumerable: true, get: function () { return key_storage_1.decryptKey; } });
var double_ratchet_1 = require("./double-ratchet");
Object.defineProperty(exports, "DoubleRatchet", { enumerable: true, get: function () { return double_ratchet_1.DoubleRatchet; } });
var session_manager_1 = require("./session-manager");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_manager_1.SessionManager; } });
var replay_protection_1 = require("./replay-protection");
Object.defineProperty(exports, "ReplayProtection", { enumerable: true, get: function () { return replay_protection_1.ReplayProtection; } });
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "SecurityRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.SecurityRateLimiter; } });
var device_security_1 = require("./device-security");
Object.defineProperty(exports, "DeviceSecurity", { enumerable: true, get: function () { return device_security_1.DeviceSecurity; } });
var audit_logger_1 = require("./audit-logger");
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return audit_logger_1.AuditLogger; } });
var security_metrics_1 = require("./security-metrics");
Object.defineProperty(exports, "SecurityMetrics", { enumerable: true, get: function () { return security_metrics_1.SecurityMetrics; } });
var socket_security_1 = require("./socket-security");
Object.defineProperty(exports, "socketSecurity", { enumerable: true, get: function () { return socket_security_1.socketSecurity; } });
Object.defineProperty(exports, "socketMessageRateLimit", { enumerable: true, get: function () { return socket_security_1.socketMessageRateLimit; } });
var message_pipeline_1 = require("./message-pipeline");
Object.defineProperty(exports, "MessagePipeline", { enumerable: true, get: function () { return message_pipeline_1.MessagePipeline; } });
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "SecurityMiddleware", { enumerable: true, get: function () { return middleware_1.SecurityMiddleware; } });
var init_1 = require("./init");
Object.defineProperty(exports, "initializeSecurity", { enumerable: true, get: function () { return init_1.initializeSecurity; } });
//# sourceMappingURL=index.js.map