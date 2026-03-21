"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
function healthCheck(serviceName, version = '2.0.0') {
    const startTime = Date.now();
    return (_req, res) => {
        res.json({
            service: serviceName,
            status: 'healthy',
            version,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            timestamp: new Date().toISOString(),
        });
    };
}
//# sourceMappingURL=health.js.map