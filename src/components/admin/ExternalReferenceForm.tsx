'use client';

import { useState } from 'react';
import { createExternalReferenceAction, updateExternalReferenceAction } from '@/app/admin/actions';
import type { Context } from '@prisma/client';

interface ExternalReferenceFormProps {
  initialData?: Context;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExternalReferenceForm({
  initialData,
  onSuccess,
  onCancel,
}: ExternalReferenceFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [link, setLink] = useState(initialData?.link || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      body,
      link,
      tags,
      isPublic: true as const,
    };

    let result;
    if (initialData?.id) {
      result = await updateExternalReferenceAction({ id: initialData.id, ...payload });
    } else {
      result = await createExternalReferenceAction(payload);
    }

    setLoading(false);

    if (result.success) {
      if (!initialData) {
        setTitle('');
        setBody('');
        setLink('');
        setTags('');
      }
      onSuccess?.();
    } else {
      setError(result.error || 'Error al guardar la referencia');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {initialData ? 'Editar Referencia Externa' : 'Nueva Referencia Externa'}
      </h3>

      {error && (
        <div className="p-3 text-sm bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="ref-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre de la herramienta / repositorio *
        </label>
        <input
          id="ref-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={150}
          placeholder="Ej: superpowers, context7, herdr"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="ref-link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Enlace (URL) *
        </label>
        <input
          id="ref-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
          placeholder="https://github.com/..."
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="ref-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción / Uso
        </label>
        <textarea
          id="ref-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="¿Para qué sirve esta herramienta y cómo se usa?"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="ref-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Etiquetas (separadas por comas)
        </label>
        <input
          id="ref-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tools, context, libraries"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2.5 rounded border border-gray-100 dark:border-gray-700">
        ℹ️ Las referencias externas son <span className="font-semibold text-emerald-600 dark:text-emerald-400">siempre públicas</span> en el catálogo para el ecosistema.
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
          {loading ? 'Guardando...' : initialData ? 'Actualizar Referencia' : 'Crear Referencia'}
        </button>
      </div>
    </form>
  );
}
