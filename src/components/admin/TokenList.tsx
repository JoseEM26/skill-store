'use client';

import { useState } from 'react';
import type { AccessToken } from '@prisma/client';
import { revokeAccessTokenAction } from '@/app/admin/actions';
import { TokenForm } from './TokenForm';
import { TokenRevealModal } from './TokenRevealModal';

interface TokenListProps {
  initialTokens: AccessToken[];
}

export function TokenList({ initialTokens }: TokenListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [revealingToken, setRevealingToken] = useState<{ rawToken: string; label: string } | null>(
    null
  );
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (id: string) => {
    if (
      !window.confirm(
        '¿Seguro que deseas revocar este token? Quedará invalidado de inmediato y cualquier cliente MCP usando este secreto será rechazado.'
      )
    ) {
      return;
    }

    setRevokingId(id);
    await revokeAccessTokenAction(id);
    setRevokingId(null);
  };

  const handleCreated = (rawToken: string, label: string) => {
    setShowCreate(false);
    setRevealingToken({ rawToken, label });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Tokens Personales MCP ({initialTokens.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Úsalos para autenticar tus agentes y servidores MCP contra el registro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="px-3.5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm"
        >
          {showCreate ? 'Cerrar Formulario' : '+ Generar Nuevo Token'}
        </button>
      </div>

      {showCreate && (
        <TokenForm onSuccess={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {revealingToken && (
        <TokenRevealModal
          rawToken={revealingToken.rawToken}
          label={revealingToken.label}
          onClose={() => setRevealingToken(null)}
        />
      )}

      {initialTokens.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No tienes tokens de acceso generados todavía. ¡Genera uno para conectar tu MCP!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialTokens.map((tok) => {
            const isRevoked = tok.revokedAt !== null;
            const isExpired = !isRevoked && tok.expiresAt !== null && new Date(tok.expiresAt) < new Date();
            const isActive = !isRevoked && !isExpired;

            return (
              <div
                key={tok.id}
                className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {isRevoked ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Revocado
                      </span>
                    ) : isExpired ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Expirado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Activo
                      </span>
                    )}

                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {tok.label || 'Token sin nombre'}
                    </h4>
                  </div>

                  {/* Scopes */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Scopes:
                    </span>
                    {tok.scopes.map((scope) => (
                      <span
                        key={scope}
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                          scope === 'read'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : scope === 'write'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>

                  {/* Metadata Dates */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1 flex-wrap">
                    <span>
                      Creado: {new Date(tok.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      Expiración:{' '}
                      {tok.expiresAt
                        ? new Date(tok.expiresAt).toLocaleDateString()
                        : 'Nunca'}
                    </span>
                    <span>
                      Último uso:{' '}
                      {tok.lastUsedAt
                        ? new Date(tok.lastUsedAt).toLocaleString()
                        : 'Nunca'}
                    </span>
                    {tok.revokedAt && (
                      <span className="text-red-500">
                        Revocado el: {new Date(tok.revokedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(tok.id)}
                      disabled={revokingId === tok.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded disabled:opacity-50"
                    >
                      {revokingId === tok.id ? 'Revocando...' : 'Revocar Token'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
