import { Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcryptjs';
import { PasswordHasherPort } from '@/shared/application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  async hash(value: string): Promise<string> {
    const salt = await genSalt(10);
    return hash(value, salt);
  }

  compare(plainText: string, hashedValue: string): Promise<boolean> {
    return compare(plainText, hashedValue);
  }
}
