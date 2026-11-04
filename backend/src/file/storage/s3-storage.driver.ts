import type {
	IStorageDriver,
	SaveFileInput,
	StoredFile
} from './storage.interface.js'
import {
	Injectable,
	InternalServerErrorException,
	Logger,
	OnModuleInit
} from '@nestjs/common'
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketPolicyCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

function required(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback
	if (!value) throw new Error(`Не задана переменная окружения ${name}`)
	return value
}

/**
 * S3-драйвер (MinIO локально, AWS S3 в проде без смены кода).
 * Ключ: `<uuid>-<timestamp><ext>`. Бакет публичный на чтение
 * (политика ставится в onModuleInit), поэтому отдаём прямую постоянную
 * ссылку — она не протухает, в отличие от presigned URL.
 */
@Injectable()
export class S3StorageDriver implements IStorageDriver, OnModuleInit {
	private readonly logger = new Logger(S3StorageDriver.name)
	private readonly client: S3Client
	private readonly bucket: string
	private readonly publicEndpoint: string

	public constructor() {
		this.bucket = required('S3_BUCKET', 'chat-uploads')
		this.publicEndpoint = required(
			'S3_PUBLIC_ENDPOINT',
			'http://localhost:9000'
		).replace(/\/+$/, '')
		this.client = new S3Client({
			region: process.env['S3_REGION'] ?? 'us-east-1',
			endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9000',
			credentials: {
				accessKeyId: required('S3_ACCESS_KEY', 'minioadmin'),
				secretAccessKey: required('S3_SECRET_KEY', 'minioadmin123')
			},
			forcePathStyle: true // обязательно для MinIO
		})
	}

	/**
	 * Самопровижининг бакета: ждём готовности MinIO (depends_on порядок
	 * не гарантирует), создаём бакет если нет, ВСЕГДА выставляем публичное
	 * чтение объектов. ПолитиКА именно на каждом старте, а не только при
	 * создании: бакет мог остаться от прошлых запусков без политики
	 * (тогда анонимный GET отдаёт 403). PutBucketPolicy идемпотентен.
	 */
	async onModuleInit(): Promise<void> {
		const maxAttempts = 30
		for (let attempt = 1; ; attempt++) {
			try {
				await this.ensureBucketExists()
				await this.ensurePublicPolicy()
				return
			} catch (error) {
				if (attempt >= maxAttempts) {
					this.logger.error(
						`MinIO недоступен после ${maxAttempts} попыток, файлы не сохранятся`,
						error as Error
					)
					return // не роняем весь бэкенд: загрузки вернут 500 с понятным логом
				}
				await new Promise(resolve => setTimeout(resolve, 2000))
			}
		}
	}

	private async ensureBucketExists(): Promise<void> {
		try {
			await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
		} catch (error) {
			const status = (error as { $metadata?: { httpStatusCode?: number } })
				?.$metadata?.httpStatusCode
			if (status === 404 || (error as Error)?.name === 'NotFound') {
				await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
				this.logger.log(`S3-бакет ${this.bucket} создан`)
				return
			}
			throw error // MinIO ещё не готов / нет сети — ретрай в onModuleInit
		}
	}

	private async ensurePublicPolicy(): Promise<void> {
		await this.client.send(
			new PutBucketPolicyCommand({
				Bucket: this.bucket,
				Policy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Principal: { AWS: ['*'] },
							Action: ['s3:GetObject'],
							Resource: [`arn:aws:s3:::${this.bucket}/*`]
						}
					]
				})
			})
		)
		this.logger.log(`S3-бакет ${this.bucket} открыт на публичное чтение`)
	}

	async save(input: SaveFileInput): Promise<StoredFile> {
		const key = `${randomUUID()}-${Date.now()}${input.extension}`
		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: input.buffer,
					ContentType: input.mimeType,
					ContentLength: input.size
				})
			)
		} catch (error) {
			this.logger.error(`Ошибка загрузки ${key} в S3`, error as Error)
			throw new InternalServerErrorException('Не удалось сохранить файл')
		}
		return {
			url: `${this.publicEndpoint}/${this.bucket}/${key}`,
			fileName: input.originalName,
			fileSize: input.size,
			mimeType: input.mimeType
		}
	}
}
