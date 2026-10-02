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
    <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest shadow-sm">
      <div className="flex items-center gap-2 border-b border-surface-container pb-3">
        <div className="w-7 h-7 rounded-lg bg-surface-container-high text-primary flex items-center justify-center text-sm font-bold">
          💡
        </div>
        <h3 className="font-headline text-base font-bold text-on-surface">
          {initialData ? 'Editar Idea' : 'Nueva Idea de Producto / Contexto'}
        </h3>
      </div>

      {error && (
        <div className="p-3 text-xs bg-error-container/20 border border-error/20 text-error rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="idea-title" className="block text-xs font-medium text-on-surface mb-1 font-headline">
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
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      <div>
        <label htmlFor="idea-body" className="block text-xs font-medium text-on-surface mb-1 font-headline">
          Detalle / Notas
        </label>
        <textarea
          id="idea-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Anota aquí requerimientos, arquitectura o ideas clave..."
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body"
        />
      </div>

      <div>
        <label htmlFor="idea-tags" className="block text-xs font-medium text-on-surface mb-1 font-headline">
          Etiquetas (separadas por comas)
        </label>
        <input
          id="idea-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="ai, mcp, architecture"
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <input
          id="idea-isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
        />
        <label htmlFor="idea-isPublic" className="text-xs text-on-surface-variant cursor-pointer select-none">
          Hacer pública esta idea (Por defecto es <span className="font-semibold text-amber-700">privada</span>)
        </label>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-surface-container">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-dim text-on-primary shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar Idea' : 'Crear Idea'}
        </button>
      </div>
    </form>
  );
}

