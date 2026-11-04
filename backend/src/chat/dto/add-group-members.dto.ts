import {
	ArrayMaxSize,
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsString
} from 'class-validator'

export class AddGroupMembersDto {
	@IsArray()
	@ArrayMinSize(1, { message: 'Выберите хотя бы одного пользователя' })
	@ArrayMaxSize(100, { message: 'Не более 100 за раз' })
	@ArrayUnique({ message: 'ID не должны повторяться' })
	@IsString({ each: true })
	public readonly memberIds!: string[]
}
