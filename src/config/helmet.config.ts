import helmet, { HelmetOptions } from 'helmet';
import { getEnv } from '../util/env.util';

export function createHelmetMiddleware() {
    const NODE_ENV = getEnv('NODE_ENV');
    const isLocal = NODE_ENV === 'local';

    const options: HelmetOptions = {
        // ✅ CSP: local에서는 꺼두는 게 개발 편함
        contentSecurityPolicy: isLocal
            ? false
            : {
                  useDefaults: true,
                  directives: {
                      defaultSrc: ["'self'"],
                      scriptSrc: ["'self'"],
                      objectSrc: ["'none'"],
                      upgradeInsecureRequests: [],
                  },
              },

        // ✅ HTTP → HTTPS 강제 (운영환경)
        hsts: isLocal
            ? false
            : {
                  maxAge: 60 * 60 * 24 * 365, // 1년
                  includeSubDomains: true,
                  preload: true,
              },

        // ✅ XSS 공격 방어
        xssFilter: true,

        // ✅ MIME-sniffing 방지
        noSniff: true,

        // ✅ clickjacking 방지
        frameguard: {
            action: 'deny',
        },

        // ✅ server: express 헤더 제거
        hidePoweredBy: true,
    };

    return helmet(options);
}
