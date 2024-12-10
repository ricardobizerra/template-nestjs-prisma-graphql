import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';

export const Auth = () => UseGuards(AuthGuard);
