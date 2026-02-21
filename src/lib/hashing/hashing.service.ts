import { Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcryptjs';

@Injectable()
export class HashingService {
  async hash(
    data: string,
    saltOrRounds: number | string = 10,
  ): Promise<string> {
    const salt =
      typeof saltOrRounds === 'number'
        ? await genSalt(saltOrRounds)
        : saltOrRounds;
    return hash(data, salt);
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return compare(data, encrypted);
  }
}
