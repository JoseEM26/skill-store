import { validateAccessToken, type TokenValidationUser } from '@/lib/auth/tokens';
import type { TokenScope } from '@/lib/validations/token';

export interface AuthenticatedMcpContext {
  ownerId: string;
  user: TokenValidationUser;
  scopes: string[];
}

export class McpAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'McpAuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Higher-order function for MCP write/delete tools.
 * Enforces token presence, validity, non-revocation, non-expiration,
 * required scope, and extracts verified ownerId.
 */
export function withAuthenticatedTool<T extends { token?: string }, R>(
  requiredScope: TokenScope,
  handler: (args: T, ctx: AuthenticatedMcpContext) => Promise<R>
) {
  return async (args: T, bearerToken?: string | null): Promise<R> => {
    const rawToken = args.token || bearerToken;
    if (!rawToken) {
      throw new McpAuthError(`Token de acceso requerido con scope '${requiredScope}'`, 401);
    }

    const authResult = await validateAccessToken(rawToken, requiredScope);
    if (!authResult.valid) {
      const isScopeError = authResult.error === 'insufficient_scope';
      throw new McpAuthError(`Autenticación fallida: ${authResult.message}`, isScopeError ? 403 : 401);
    }

    return await handler(args, {
      ownerId: authResult.user.id,
      user: authResult.user,
      scopes: authResult.token?.scopes || [],
    });
  };
}
