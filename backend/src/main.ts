import { AppModule } from './app.module.js'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { RedisStore } from 'connect-redis'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { createClient } from 'redis'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = app.get(ConfigService)

	const redis = createClient({ url: config.getOrThrow('REDIS_URI') })
	redis.on('error', error => console.error('Redis client error:', error))
	await redis.connect()

	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')))

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	)

	app.use(
		session({
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
	)

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	})

	await app.listen(config.getOrThrow<number>('APPLICATION_PORT'))
}
await bootstrap()
