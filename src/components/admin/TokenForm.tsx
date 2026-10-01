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
      className="space-y-5 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        Generar Nuevo Token de Acceso MCP
      </h3>

      {error && (
        <div className="p-3 text-sm bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="token-label"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Permisos (Scopes) *
        </label>
        <div className="space-y-2">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('read')}
              onChange={() => toggleScope('read')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">read</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lectura de catálogo, skills, versiones y contextos accesibles.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('write')}
              onChange={() => toggleScope('write')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">write</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Creación y actualización de skills, versiones e ideas de contexto propias.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scopes.includes('delete')}
              onChange={() => toggleScope('delete')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">delete</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Eliminación de recursos y contextos pertenecientes a tu cuenta.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="token-expiration"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Expiración
        </label>
        <select
          id="token-expiration"
          value={expirationPreset}
          onChange={(e) =>
            setExpirationPreset(e.target.value as 'never' | '30d' | '90d' | '365d')
          }
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        >
          <option value="30d">30 días</option>
          <option value="90d">90 días (Recomendado)</option>
          <option value="365d">1 año</option>
          <option value="never">Sin expiración</option>
        </select>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
        >
          {loading ? 'Generando...' : 'Generar Token'}
        </button>
      </div>
    </form>
  );
}
