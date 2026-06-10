import { Request, Response } from 'express';

export function healthCheck(serviceName: string, version = '2.0.0') {
  const startTime = Date.now();
  return (_req: Request, res: Response) => {
    res.json({
      service: serviceName,
      status: 'healthy',
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  };
}
