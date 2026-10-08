'use client';

import { useState } from 'react';
import {
  createSkillAction,
  createSkillContentAction,
  updateSkillAction,
  updateSkillContentAction,
} from '@/app/admin/actions';
import type { Skill } from '@prisma/client';
import type { SkillWithVersions } from '@/lib/admin/skills';

interface SkillFormProps {
  initialData?: Skill | SkillWithVersions;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SkillForm({ initialData, onSuccess, onCancel }: SkillFormProps) {
  const existingFiles = (initialData as SkillWithVersions)?.versions?.[0]?.files as Record<string, string> | undefined;

  const [mode, setMode] = useState<'metadata' | 'content'>(initialData ? 'metadata' : 'content');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [license, setLicense] = useState(initialData?.license || 'MIT');
  const [repositoryUrl, setRepositoryUrl] = useState(initialData?.repositoryUrl || '');
  const [content, setContent] = useState(existingFiles?.['SKILL.md'] || '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;
    if (initialData?.id) {
      result = await updateSkillAction({
        id: initialData.id,
        name,
        description,
        license,
        repositoryUrl,
        isPublic,
      });
    } else {
      result = await createSkillAction({
        slug,
        name,
        description,
        license,
        repositoryUrl,
        isPublic,
      });
    }

    setLoading(false);

    if (result.success) {
      if (!initialData) {
        setSlug('');
        setName('');
        setDescription('');
        setLicense('MIT');
        setRepositoryUrl('');
        setContent('');
        setIsPublic(true);
      }
      onSuccess?.();
    } else {
      setError(result.error || 'Error al guardar la skill');
    }
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;
    if (initialData?.id) {
      result = await updateSkillContentAction({
        id: initialData.id,
        content,
        isPublic,
      });
    } else {
      result = await createSkillContentAction({
        content,
        isPublic,
      });
    }

    setLoading(false);

    if (result.success) {
      if (!initialData) {
        setSlug('');
        setName('');
        setDescription('');
        setLicense('MIT');
        setRepositoryUrl('');
        setContent('');
        setIsPublic(true);
      }
      onSuccess?.();
    } else {
      setError(result.error || 'Error al guardar el contenido');
    }
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b pb-3 border-surface-container">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          {initialData ? 'Editar Skill' : 'Registrar Nueva Skill'}
        </h3>
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg text-xs">
          <button
            type="button"
            data-testid="tab-content"
            onClick={() => {
              setMode('content');
              setError(null);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              mode === 'content'
                ? 'bg-surface-container-lowest text-primary shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Cargar Contenido (Markdown)
          </button>
          <button
            type="button"
            data-testid="tab-metadata"
            onClick={() => {
              setMode('metadata');
              setError(null);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              mode === 'metadata'
                ? 'bg-surface-container-lowest text-primary shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Metadatos
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="form-error"
          className="p-3 text-xs bg-error-container/20 border border-error/20 text-error rounded-lg whitespace-pre-wrap font-body"
        >
          {error}
        </div>
      )}

      {mode === 'metadata' ? (
        <form onSubmit={handleSubmitMetadata} className="space-y-4">
          <div>
            <label htmlFor="skill-slug" className="block text-xs font-medium text-on-surface mb-1 font-headline">
              Slug (identificador único para tu usuario) *
            </label>
            <input
              id="skill-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
              required
              disabled={!!initialData}
              maxLength={100}
              placeholder="ej: my-awesome-skill"
              className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-outline mt-1 font-body">
              {initialData
                ? 'El slug identifica la skill y no se puede modificar.'
                : 'Solo letras minúsculas, números, guiones y guiones bajos.'}
            </p>
          </div>

          <div>
            <label htmlFor="skill-name" className="block text-xs font-medium text-on-surface mb-1 font-headline">
              Nombre de la Skill *
            </label>
            <input
              id="skill-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Ej: My Awesome Skill"
              className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body"
            />
          </div>

          <div>
            <label htmlFor="skill-desc" className="block text-xs font-medium text-on-surface mb-1 font-headline">
              Descripción
            </label>
            <textarea
              id="skill-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe qué hace esta skill y qué problemas resuelve..."
              className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-body"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="skill-license" className="block text-xs font-medium text-on-surface mb-1 font-headline">
                Licencia
              </label>
              <input
                id="skill-license"
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="MIT, Apache-2.0, etc."
                className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
              />
            </div>

            <div>
              <label htmlFor="skill-repo" className="block text-xs font-medium text-on-surface mb-1 font-headline">
                URL del Repositorio
              </label>
              <input
                id="skill-repo"
                type="url"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="skill-metadata-isPublic"
              data-testid="skill-isPublic-checkbox"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="skill-metadata-isPublic" className="text-xs text-on-surface-variant cursor-pointer select-none">
              Pública (visible para toda la comunidad en el catálogo)
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
              {loading ? 'Guardando...' : initialData ? 'Actualizar Skill' : 'Registrar Skill'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmitContent} className="space-y-4">
          <div>
            <label htmlFor="skill-content" className="block text-xs font-medium text-on-surface mb-1 font-headline">
              Contenido Completo (SKILL.md) *
            </label>
            <textarea
              id="skill-content"
              data-testid="skill-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={14}
              placeholder={`---
name: ${slug || 'nombre-de-la-skill'}
description: Explicación concisa...
license: MIT
compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
metadata:
  version: "1.0.0"
  author: "Tu Nombre"
---

## 1. Propósito y Cuándo Usar
...

## 2. Flujo de Trabajo (Workflow)
...

## 3. Reglas y Restricciones (Criterios de Diseño)
...

## 4. Árbol de Decisión (Si aplica)
...

## 5. Ejemplos Ejecutables
...

## 6. Manejo de Errores y Casos Excepcionales
...`}
              className="w-full px-3 py-2 border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
            />
            <p className="text-xs text-outline mt-1 font-body">
              Pega el archivo Markdown completo con el frontmatter YAML y las 6 secciones obligatorias. Los campos name, description y license se sincronizarán automáticamente.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="skill-content-isPublic"
              data-testid="skill-content-isPublic-checkbox"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="skill-content-isPublic" className="text-xs text-on-surface-variant cursor-pointer select-none">
              Pública (visible para toda la comunidad en el catálogo)
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
              data-testid="save-content-btn"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-dim text-on-primary shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Contenido'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
