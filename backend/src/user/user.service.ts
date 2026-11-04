import { AuthMethod, Department } from '../../prisma/__generated__/index.js'
import type { UpdateProfileDto } from './dto/update-profile.dto.js'
import { PrismaService } from '@/prisma/prisma.service.js'
import { Injectable, NotFoundException } from '@nestjs/common'
import { hash } from 'argon2'

const PUBLIC_USER_SELECT = {
	id: true,
	name: true,
	email: true,
	image: true,
	bio: true,
	role: true,
	department: true,
	isOnline: true,
	createdAt: true,
	updatedAt: true
} as const

@Injectable()
export class UserService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findById(id: string) {
		const user = await this.prismaService.user.findUnique({
			where: {
				id
			},
			include: {
				accounts: true
			}
		})

		if (!user) {
			throw new NotFoundException(
				'Пользователь не найден. Пожалуйста проверть введённые данные.'
			)
		}

		return user
	}

	public async findPublicById(id: string) {
		const user = await this.prismaService.user.findUnique({
			where: { id },
			select: PUBLIC_USER_SELECT
		})
		if (!user) {
			throw new NotFoundException('Пользователь не найден.')
		}
		return user
	}

	/**
	 * Обновление профиля строго по whitelist: name/avatar→image/bio/department.
	 * Остальные поля отсекаются DTO + forbidNonWhitelisted на контроллере.
	 */
	public async updateProfile(userId: string, dto: UpdateProfileDto) {
		const data: {
			name?: string
			image?: string
			bio?: string
			department?: Department
		} = {}
		if (typeof dto.name !== 'undefined') data.name = dto.name.trim()
		if (typeof dto.avatar !== 'undefined') data.image = dto.avatar
		if (typeof dto.bio !== 'undefined') data.bio = dto.bio
		if (typeof dto.department !== 'undefined')
			data.department = dto.department

		const user = await this.prismaService.user.update({
			where: { id: userId },
			data,
			select: PUBLIC_USER_SELECT
		}).catch(() => null)
		if (!user) throw new NotFoundException('Пользователь не найден.')
		return user
	}

	public async setOnlineStatus(userId: string, isOnline: boolean) {
		return this.prismaService.user
			.update({
				where: { id: userId },
				data: { isOnline },
				select: { id: true, isOnline: true }
			})
			.catch(() => null)
	}

	/** Поиск пользователей для сайдбара (без текущего, без паролей). */
	public async searchUsers(query: string, excludeUserId: string, take = 20) {
		const q = query.trim()
		return this.prismaService.user.findMany({
			where: {
				id: { not: excludeUserId },
				...(q
					? {
							OR: [
								{ name: { contains: q, mode: 'insensitive' } },
								{ email: { contains: q, mode: 'insensitive' } }
							]
						}
					: undefined)
			},
			select: PUBLIC_USER_SELECT,
			take: Math.min(Math.max(take, 1), 50),
			orderBy: [{ isOnline: 'desc' }, { name: 'asc' }]
		})
	}

	public async findByEmail(email: string) {
		const user = await this.prismaService.user.findUnique({
			where: {
				email
			},
			include: {
				accounts: true
			}
		})

		if (!user) {
			throw new NotFoundException(
				'Пользователь не найден. Пожалуйста проверть введённые данные.'
			)
		}

		return user
	}

	public async create(
		email: string,
		password: string,
		displayName: string,
		department: Department,
		method: AuthMethod
	) {
		const user = await this.prismaService.user.create({
			data: {
				email,
				password: password ? await hash(password) : '',
				name: displayName,
				method: method,
				department
			},
			include: {
				accounts: true
			}
		})

		return user
	}
}
