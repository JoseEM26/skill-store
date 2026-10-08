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
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Tokens Personales MCP ({initialTokens.length})
          </h3>
          <p className="font-body text-xs text-on-surface-variant">
            Úsalos para autenticar tus agentes y servidores MCP contra el registro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="px-3.5 py-2 text-xs bg-primary hover:bg-primary-dim text-on-primary font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
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
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-dashed border-surface-container-highest">
          <p className="font-body text-on-surface-variant text-sm">
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
                className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {isRevoked ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-error-container/30 text-on-error-container border border-error/20">
                        Revocado
                      </span>
                    ) : isExpired ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-800 border border-amber-300">
                        Expirado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Activo
                      </span>
                    )}

                    <h4 className="font-mono text-base font-bold text-on-surface">
                      {tok.label || 'Token sin nombre'}
                    </h4>
                  </div>

                  {/* Scopes */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-on-surface-variant font-medium">
                      Scopes:
                    </span>
                    {tok.scopes.map((scope) => (
                      <span
                        key={scope}
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                          scope === 'read'
                            ? 'bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim'
                            : scope === 'write'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary-fixed-dim'
                            : 'bg-error-container/20 text-error border border-error/20'
                        }`}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>

                  {/* Metadata Dates */}
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-1 flex-wrap">
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
                      <span className="text-error font-medium">
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
                      className="px-3 py-1.5 text-xs font-medium text-error bg-error-container/20 hover:bg-error-container/40 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
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
