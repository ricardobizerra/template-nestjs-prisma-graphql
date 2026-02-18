import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserModel {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({
    example: 'https://cdn.discordapp.com/embed/avatars/0.png',
    nullable: true,
  })
  image?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;
}
