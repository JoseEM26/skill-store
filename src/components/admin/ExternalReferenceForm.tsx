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
    <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest shadow-sm">
      <div className="flex items-center gap-2 border-b border-surface-container pb-3">
        <div className="w-7 h-7 rounded-lg bg-surface-container-high text-primary flex items-center justify-center text-sm font-bold">
          🔗
        </div>
        <h3 className="font-headline text-base font-bold text-on-surface">
          {initialData ? 'Editar Referencia Externa' : 'Nueva Referencia Externa'}
        </h3>
      </div>

      {error && (
        <div className="p-3 text-xs bg-error-container/20 border border-error/20 text-error rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="ref-title" className="block text-xs font-medium text-on-surface mb-1 font-headline">
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
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      <div>
        <label htmlFor="ref-link" className="block text-xs font-medium text-on-surface mb-1 font-headline">
          Enlace (URL) *
        </label>
        <input
          id="ref-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
          placeholder="https://github.com/..."
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div>
        <label htmlFor="ref-body" className="block text-xs font-medium text-on-surface mb-1 font-headline">
          Descripción / Uso
        </label>
        <textarea
          id="ref-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="¿Para qué sirve esta herramienta y cómo se usa?"
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body"
        />
      </div>

      <div>
        <label htmlFor="ref-tags" className="block text-xs font-medium text-on-surface mb-1 font-headline">
          Etiquetas (separadas por comas)
        </label>
        <input
          id="ref-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tools, context, libraries"
          className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-surface-container-highest flex items-center gap-1.5">
        <span className="text-primary font-bold">ℹ️</span>
        <span>
          Las referencias externas son <span className="font-semibold text-emerald-700">siempre públicas</span> en el catálogo para el ecosistema.
        </span>
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
          {loading ? 'Guardando...' : initialData ? 'Actualizar Referencia' : 'Crear Referencia'}
        </button>
      </div>
    </form>
  );
}

