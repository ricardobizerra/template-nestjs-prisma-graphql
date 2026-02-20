export const PASSWORD_HASHER_PORT = Symbol('PASSWORD_HASHER_PORT');

export interface PasswordHasherPort {
  hash(value: string): Promise<string>;
  compare(plainText: string, hashedValue: string): Promise<boolean>;
}
