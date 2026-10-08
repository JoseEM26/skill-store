'use client';

import { useState } from 'react';
import { createAccessTokenAction } from '@/app/admin/actions';
import type { TokenScope } from '@/lib/validations/token';

interface TokenFormProps {
  onSuccess: (rawToken: string, label: string) => void;
  onCancel: () => void;
}

export function TokenForm({ onSuccess, onCancel }: TokenFormProps) {
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<TokenScope[]>(['read', 'write']);
  const [expirationPreset, setExpirationPreset] = useState<'never' | '30d' | '90d' | '365d'>('90d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: TokenScope) => {
    if (scopes.includes(scope)) {
      if (scopes.length === 1) {
        setError('Debes mantener seleccionado al menos un scope.');
        return;
      }
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let expiresAt: Date | null = null;
    const now = Date.now();
    if (expirationPreset === '30d') {
      expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
    } else if (expirationPreset === '90d') {
      expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000);
    } else if (expirationPreset === '365d') {
      expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
    }

    const res = await createAccessTokenAction({
      label,
      scopes,
      expiresAt,
    });

    setLoading(false);

    if (res.success && res.data) {
      onSuccess(res.data.rawToken, label);
    } else {
      setError(res.error || 'Error al generar el token');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest shadow-xs"
    >
      <h3 className="font-headline text-lg font-bold text-on-surface">
        Generar Nuevo Token de Acceso MCP
      </h3>

      {error && (
        <div className="p-3 text-xs bg-error-container/20 border border-error/20 text-error rounded-lg font-body">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="token-label"
          className="block text-xs font-medium text-on-surface mb-1 font-headline"
        >
          Nombre / Etiqueta del Token *
        </label>
        <input
          id="token-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={100}
          placeholder="Ej: Claude Code Desktop, Terminal de trabajo, Script CI"
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-on-surface mb-2 font-headline">
          Permisos (Scopes) *
        </label>
        <div className="space-y-2">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('read')}
              onChange={() => toggleScope('read')}
              className="mt-1 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold font-mono text-on-surface">read</span>
              <p className="text-xs text-on-surface-variant font-body">
                Lectura de catálogo, skills, versiones y contextos accesibles.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('write')}
              onChange={() => toggleScope('write')}
              className="mt-1 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold font-mono text-on-surface">write</span>
              <p className="text-xs text-on-surface-variant font-body">
                Creación y actualización de skills, versiones e ideas de contexto propias.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('delete')}
              onChange={() => toggleScope('delete')}
              className="mt-1 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold font-mono text-on-surface">delete</span>
              <p className="text-xs text-on-surface-variant font-body">
                Eliminación de recursos y contextos pertenecientes a tu cuenta.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="token-expiration"
          className="block text-xs font-medium text-on-surface mb-1 font-headline"
        >
          Expiración
        </label>
        <select
          id="token-expiration"
          value={expirationPreset}
          onChange={(e) =>
            setExpirationPreset(e.target.value as 'never' | '30d' | '90d' | '365d')
          }
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body cursor-pointer"
        >
          <option value="30d">30 días</option>
          <option value="90d">90 días (Recomendado)</option>
          <option value="365d">1 año</option>
          <option value="never">Sin expiración</option>
        </select>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-surface-container">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-3.5 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-dim text-on-primary shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Generando...' : 'Generar Token'}
        </button>
      </div>
    </form>
  );
}
