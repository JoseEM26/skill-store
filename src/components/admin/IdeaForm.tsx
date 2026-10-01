'use client';

import { useState } from 'react';
import { createIdeaAction, updateIdeaAction } from '@/app/admin/actions';
import type { Context } from '@prisma/client';

interface IdeaFormProps {
  initialData?: Context;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IdeaForm({ initialData, onSuccess, onCancel }: IdeaFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      body,
      tags,
      isPublic,
    };

    let result;
    if (initialData?.id) {
      result = await updateIdeaAction({ id: initialData.id, ...payload });
    } else {
      result = await createIdeaAction(payload);
    }

    setLoading(false);

    if (result.success) {
      if (!initialData) {
        setTitle('');
        setBody('');
        setTags('');
        setIsPublic(false);
      }
      onSuccess?.();
    } else {
      setError(result.error || 'Error al guardar la idea');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {initialData ? 'Editar Idea' : 'Nueva Idea de Producto / Contexto'}
      </h3>

      {error && (
        <div className="p-3 text-sm bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="idea-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Título *
        </label>
        <input
          id="idea-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={150}
          placeholder="Ej: Integración de memoria persistente con Engram"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="idea-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Detalle / Notas
        </label>
        <textarea
          id="idea-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Anota aquí requerimientos, arquitectura o ideas clave..."
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="idea-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Etiquetas (separadas por comas)
        </label>
        <input
          id="idea-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="ai, mcp, architecture"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <input
          id="idea-isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="idea-isPublic" className="text-sm text-gray-700 dark:text-gray-300">
          Hacer pública esta idea (Por defecto es <span className="font-semibold text-amber-600 dark:text-amber-400">privada</span>)
        </label>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar Idea' : 'Crear Idea'}
        </button>
      </div>
    </form>
  );
}
