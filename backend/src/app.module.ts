import { AuthModule } from './auth/auth.module.js'
import { ChatModule } from './chat/chat.module.js'
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { UserModule } from './user/user.module.js'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { FileModule } from './file/file.module.js';
import { UPLOAD_DIR } from './file/file.constants.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		PrismaModule,
		AuthModule,
		UserModule,
		ChatModule,
		ServeStaticModule.forRoot({
			rootPath: UPLOAD_DIR,
			serveRoot: '/static'
		}),
		FileModule
	]
})
export class AppModule {}
