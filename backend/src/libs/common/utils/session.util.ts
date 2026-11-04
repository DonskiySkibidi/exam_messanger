import type { ConfigService } from '@nestjs/config'
import session from 'express-session'
import { createClient } from 'redis'
import { RedisStore } from 'connect-redis'

/**
 * Единая фабрика session-middleware.
 * Используется и в main.ts (HTTP), и в ChatGateway.afterInit (WS engine),
 * чтобы `socket.request.session.userId` был доступен в WsAuthGuard.
 */
export function buildSessionMiddleware(config: ConfigService) {
	const redis = createClient({ url: config.getOrThrow('REDIS_URI') })
	redis.on('error', error => console.error('Redis client error:', error))
	// engine.use не ждёт connect — fire-and-forget, как в main.ts ждём отдельно.
	void redis.connect().catch(error => console.error('Redis connect error:', error))

	return session({
		secret: config.getOrThrow('SESSION_SECRET'),
		name: config.getOrThrow('SESSION_NAME'),
		resave: true,
		saveUninitialized: false,
		cookie: {
			domain: config.getOrThrow('SESSION_DOMAIN'),
			maxAge: 30 * 24 * 60 * 60 * 1000,
			httpOnly: true,
			secure: false,
			sameSite: 'lax'
		},
		store: new RedisStore({
			client: redis,
			prefix: config.getOrThrow('SESSION_FOLDER')
		})
	})
}
