import { PrismaPg } from '@prisma/adapter-pg'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { hash } from 'argon2'
import { PrismaClient } from './__generated__/index.js'

const prisma = new PrismaClient({
	adapter: new PrismaPg({
		connectionString: process.env.POSTGRES_URI
	})
})

const PASSWORD = 'password123'

const users = [
	{
		email: 'admin@chat.local',
		name: 'Админ',
		role: 'ADMIN' as const,
		department: 'IT' as const,
		bio: 'Администратор мессенджера'
	},
	{
		email: 'alice@chat.local',
		name: 'Алиса',
		role: 'USER' as const,
		department: 'IT' as const,
		bio: 'Фронтенд-разработчик'
	},
	{
		email: 'bob@chat.local',
		name: 'Боб',
		role: 'USER' as const,
		department: 'HR' as const,
		bio: 'HR-менеджер'
	},
	{
		email: 'carol@chat.local',
		name: 'Карол',
		role: 'USER' as const,
		department: 'SALES' as const,
		bio: 'Менеджер по продажам'
	},
	{
		email: 'dave@chat.local',
		name: 'Дэйв',
		role: 'USER' as const,
		department: 'MARKETING' as const,
		bio: null
	}
]

/** Детерминированный ключ DIRECT-пары, как в ChatService.buildDirectKey. */
function directKey(a: string, b: string): string {
	return a < b ? `${a}:${b}` : `${b}:${a}`
}

const SEED_WELCOME_TEXT = 'Добро пожаловать в общий чат команды!'
const SEED_WELCOME_KEY = 'seed/welcome.txt'

/**
 * Заливает сид-файл в тот же бакет, куда пишет S3StorageDriver,
 * и возвращает тот же формат публичного URL. Файл перезаписываемый,
 * поэтому повторный сид безопасен.
 */
async function uploadSeedFile(): Promise<string> {
	const bucket = process.env['S3_BUCKET'] ?? 'chat-uploads'
	const publicEndpoint = (
		process.env['S3_PUBLIC_ENDPOINT'] ?? 'http://localhost:9000'
	).replace(/\/+$/, '')
	const client = new S3Client({
		region: process.env['S3_REGION'] ?? 'us-east-1',
		endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9000',
		credentials: {
			accessKeyId: process.env['S3_ACCESS_KEY'] ?? 'minioadmin',
			secretAccessKey: process.env['S3_SECRET_KEY'] ?? 'minioadmin123'
		},
		forcePathStyle: true
	})
	const body = Buffer.from(SEED_WELCOME_TEXT, 'utf-8')
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: SEED_WELCOME_KEY,
			Body: body,
			ContentType: 'text/plain',
			ContentLength: body.length
		})
	)
	return `${publicEndpoint}/${bucket}/${SEED_WELCOME_KEY}`
}

async function main() {
	const passwordHash = await hash(PASSWORD)

	// --- Пользователи (идемпотентно) ---
	const byEmail = new Map<string, string>()
	for (const u of users) {
		const user = await prisma.user.upsert({
			where: { email: u.email },
			update: {
				name: u.name,
				role: u.role,
				department: u.department,
				bio: u.bio,
				password: passwordHash
			},
			create: {
				email: u.email,
				name: u.name,
				password: passwordHash,
				role: u.role,
				department: u.department,
				bio: u.bio
			},
			select: { id: true, email: true }
		})
		byEmail.set(u.email, user.id)
	}
	const admin = byEmail.get('admin@chat.local')!
	const alice = byEmail.get('alice@chat.local')!
	const bob = byEmail.get('bob@chat.local')!
	const carol = byEmail.get('carol@chat.local')!
	const dave = byEmail.get('dave@chat.local')!

	// --- Чаты и сообщения: чистим только чат-таблицы, юзеров не трогаем ---
	await prisma.attachment.deleteMany()
	await prisma.message.deleteMany()
	await prisma.chatMember.deleteMany()
	await prisma.chat.deleteMany()

	// DIRECT: админ ↔ алиса (2 сообщения)
	const direct1 = await prisma.chat.create({
		data: {
			type: 'DIRECT',
			directKey: directKey(admin, alice),
			members: { create: [{ userId: admin }, { userId: alice }] }
		}
	})
	const d1m1 = await prisma.message.create({
		data: {
			chatId: direct1.id,
			senderId: admin,
			content: 'Привет, Алиса! Добро пожаловать в мессенджер 👋'
		}
	})
	const d1m2 = await prisma.message.create({
		data: {
			chatId: direct1.id,
			senderId: alice,
			content: 'Привет! Уже осваиваюсь, спасибо 😊'
		}
	})
	await prisma.chat.update({
		where: { id: direct1.id },
		data: { lastMessageId: d1m2.id }
	})
	// Оба прочитали всё: тики «прочитано», бейджей нет.
	for (const userId of [admin, alice]) {
		await prisma.chatMember.update({
			where: { userId_chatId: { userId, chatId: direct1.id } },
			data: { lastReadAt: d1m2.createdAt }
		})
	}
	void d1m1

	// DIRECT: боб ↔ карол (1 сообщение)
	const direct2 = await prisma.chat.create({
		data: {
			type: 'DIRECT',
			directKey: directKey(bob, carol),
			members: { create: [{ userId: bob }, { userId: carol }] }
		}
	})
	const d2m1 = await prisma.message.create({
		data: {
			chatId: direct2.id,
			senderId: bob,
			content: 'Карол, подскажи статус по сделке?'
		}
	})
	await prisma.chat.update({
		where: { id: direct2.id },
		data: { lastMessageId: d2m1.id }
	})
	// Карол ещё не заходила: у неё unread=1, у боба тик «отправлено».
	await prisma.chatMember.update({
		where: { userId_chatId: { userId: bob, chatId: direct2.id } },
		data: { lastReadAt: d2m1.createdAt }
	})
	await prisma.chatMember.update({
		where: { userId_chatId: { userId: carol, chatId: direct2.id } },
		data: { lastReadAt: new Date(0) }
	})

	// GROUP: команда разработки (админ — MemberRole.ADMIN)
	const group = await prisma.chat.create({
		data: {
			type: 'GROUP',
			directKey: null,
			name: 'Команда разработки',
			description: 'Общий чат команды',
			members: {
				create: [
					{ userId: admin, role: 'ADMIN' },
					{ userId: alice, role: 'MEMBER' },
					{ userId: bob, role: 'MEMBER' },
					{ userId: carol, role: 'MEMBER' }
				]
			}
		}
	})
	const g1 = await prisma.message.create({
		data: {
			chatId: group.id,
			senderId: admin,
			content: 'Коллеги, добро пожаловать в общий чат команды!'
		}
	})
	const g2 = await prisma.message.create({
		data: {
			chatId: group.id,
			senderId: carol,
			content: 'Всем привет! На связи 👋',
			attachments: {
				create: {
					url: await uploadSeedFile(),
					fileName: 'welcome.txt',
					fileSize: Buffer.byteLength(SEED_WELCOME_TEXT),
					mimeType: 'text/plain',
					uploaderId: carol
				}
			}
		}
	})
	await prisma.chat.update({
		where: { id: group.id },
		data: { lastMessageId: g2.id }
	})
	// Админ, алиса и карол прочитали всё; боб отстал на g1:
	// у него unread=1, остальные видят частичное прочтение g2.
	for (const userId of [admin, alice, carol]) {
		await prisma.chatMember.update({
			where: { userId_chatId: { userId, chatId: group.id } },
			data: { lastReadAt: g2.createdAt }
		})
	}
	await prisma.chatMember.update({
		where: { userId_chatId: { userId: bob, chatId: group.id } },
		data: { lastReadAt: g1.createdAt }
	})
	void g1
	void dave

	console.log('Seed OK:')
	console.log(`  users: ${users.length} (пароль у всех: ${PASSWORD})`)
	console.log('  - admin@chat.local (ADMIN)')
	console.log('  - alice@chat.local, bob@chat.local, carol@chat.local, dave@chat.local (USER)')
	console.log('  chats: 2 DIRECT + 1 GROUP ("Команда разработки")')
	console.log('  messages: 6 (1 с вложением)')
}

try {
	await main()
} catch (error) {
	console.error('Seed FAILED:', error)
	process.exitCode = 1
} finally {
	await prisma.$disconnect()
}
