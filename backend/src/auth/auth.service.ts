import { AuthMethod, User } from '../../prisma/__generated__/index.js'
import { LoginDto } from './dto/login.dto.js'
import { RegisterDto } from './dto/register.dto.js'
import { UserService } from '@/user/user.service.js'
import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { verify } from 'argon2'
import { Request, Response } from 'express'

@Injectable()
export class AuthService {
	public constructor(private readonly userService: UserService) {}
	public async register(req: Request, dto: RegisterDto) {
		try {
			await this.userService.findByEmail(dto.email)
		} catch (e) {
			if (e instanceof NotFoundException) {
				const newUser = await this.userService.create(
					dto.email,
					dto.password,
					dto.name,
					dto.department,
					AuthMethod.CREDENTIALS
				)
				return this.saveSession(req, newUser)
			}

			throw e
		}

		throw new ConflictException(
			'Регистрация не удалась. Пользователь существует. Пожалуйста, используйте другой email или войдите в систему.'
		)
	}

	public async login(req: Request, dto: LoginDto) {
		const user = await this.userService.findByEmail(dto.email)

		if (!user || !user.password) {
			throw new NotFoundException(
				'Пользователь не найден. Проверьте введённые данные.'
			)
		}

		const isValidPassword = await verify(user.password, dto.password)

		if (!isValidPassword) {
			throw new UnauthorizedException(
				'Неверный пароль. Пожалуйста, попробуйте ещё раз или восстановите пароль.'
			)
		}

		return this.saveSession(req, user)
	}

	public async logout(req: Request, res: Response): Promise<void> {
		return new Promise((resolve, rej) => {
			req.session.destroy(err => {
				if (err) {
					return rej(
						new InternalServerErrorException(
							'Не удалось завершить сессию. Возможно проблема с сервером или сессия уже была завершена'
						)
					)
				}

				res.clearCookie('session')

				resolve()
			})
		})
	}

	private async saveSession(req: Request, user: User) {
		return new Promise((res, rej) => {
			req.session.userId = user.id

			req.session.save(err => {
				if (err) {
					return rej(
						new InternalServerErrorException(
							'Не удалось сохранить сессию. Проверьте правильно ли настроены параметры сессии.'
						)
					)
				}

				res({
					user
				})
			})
		})
	}
}
