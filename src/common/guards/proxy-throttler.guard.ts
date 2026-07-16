import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate-limit by the REAL client IP. Behind Cloudflare → Fly the socket peer is
// the proxy, so the default tracker buckets every visitor together (breaking the
// limit). Prefer the provider's true-client header, then X-Forwarded-For, then ip.
@Injectable()
export class ProxyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = (req.headers ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
    const first = (v: string | string[] | undefined): string | undefined =>
      Array.isArray(v) ? v[0] : v;

    const cf = first(headers['cf-connecting-ip']);
    const fly = first(headers['fly-client-ip']);
    const xff = first(headers['x-forwarded-for'])?.split(',')[0]?.trim();
    const ip = cf || fly || xff || (req.ip as string | undefined) || 'unknown';

    return Promise.resolve(ip);
  }
}
