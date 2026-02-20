export const CONFIG_PORT = Symbol('CONFIG_PORT');

export interface ConfigPort {
  getNodeEnv(): string;
  getJwtExpiresInSeconds(): number;
  getRefreshTokenExpiresInDays(): number;
  getRefreshTokenSecret(): string;
  getFrontendUrl(): string;
}
