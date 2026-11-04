import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets'

/**
 * Логирует ВСЕ WS-ошибки в stdout (docker logs) и отдаёт их в ack клиента.
 * Покрывает и WsException, и Http-исключения (400 валидации, 403, 404),
 * которыми кидаются ValidationPipe/guard/service. Без него причины падения
 * saveMessage были видны только в недрах Nest, а клиент получал «успех».
 */
@Catch()
export class WsLoggingFilter extends BaseWsExceptionFilter {
	private readonly logger = new Logger('WsExceptions')

	public catch(exception: unknown, host: ArgumentsHost): void {
		const client = host.switchToWs().getClient<{ id?: string }>()
		const data = host.switchToWs().getData()
		const message =
			exception instanceof WsException
				? String(exception.getError())
				: exception instanceof HttpException
					? `${exception.getStatus()} ${JSON.stringify(exception.getResponse())}`
					: String((exception as Error)?.message ?? exception)
		this.logger.error(
			`WS error [socket=${client?.id ?? '?'}] ${message} | data=${JSON.stringify(data)?.slice(0, 500)}`
		)
		super.catch(
			exception instanceof WsException
				? exception
				: new WsException(message),
			host
		)
	}
}
