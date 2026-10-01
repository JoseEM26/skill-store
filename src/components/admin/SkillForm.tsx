'use client';

import { useState } from 'react';
import { createSkillAction, updateSkillAction } from '@/app/admin/actions';
import type { Skill } from '@prisma/client';

interface SkillFormProps {
  initialData?: Skill;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SkillForm({ initialData, onSuccess, onCancel }: SkillFormProps) {
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [license, setLicense] = useState(initialData?.license || 'MIT');
  const [repositoryUrl, setRepositoryUrl] = useState(initialData?.repositoryUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
      });
    } else {
      result = await createSkillAction({
        slug,
        name,
        description,
        license,
        repositoryUrl,
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
      }
      onSuccess?.();
    } else {
      setError(result.error || 'Error al guardar la skill');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {initialData ? 'Editar Skill' : 'Registrar Nueva Skill'}
      </h3>

      {error && (
        <div className="p-3 text-sm bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="skill-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">
          {initialData
            ? 'El slug identifica la skill y no se puede modificar.'
            : 'Solo letras minúsculas, números, guiones y guiones bajos.'}
        </p>
      </div>

      <div>
        <label htmlFor="skill-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div>
        <label htmlFor="skill-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción
        </label>
        <textarea
          id="skill-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe qué hace esta skill y qué problemas resuelve..."
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="skill-license" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Licencia
          </label>
          <input
            id="skill-license"
            type="text"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="MIT, Apache-2.0, etc."
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="skill-repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL del Repositorio
          </label>
          <input
            id="skill-repo"
            type="url"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/..."
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
          />
        </div>
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
          {loading ? 'Guardando...' : initialData ? 'Actualizar Skill' : 'Registrar Skill'}
        </button>
      </div>
    </form>
  );
}
