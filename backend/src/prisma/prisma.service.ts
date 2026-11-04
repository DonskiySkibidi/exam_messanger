import { PrismaClient } from '../../prisma/__generated__/index.js'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	public constructor(config: ConfigService) {
		const adapter = new PrismaPg({
			connectionString: config.getOrThrow<string>('POSTGRES_URI')
		})
		super({ adapter })
	}

	public async onModuleDestroy() {
		await this.$disconnect()
	}
	public async onModuleInit() {
		await this.$connect()
	}
}
