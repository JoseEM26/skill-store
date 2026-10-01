'use client';

import { useState } from 'react';
import type { SkillWithVersions } from '@/lib/admin/skills';
import { deleteSkillAction } from '@/app/admin/actions';
import { SkillForm } from './SkillForm';
import Link from 'next/link';

interface SkillListProps {
  initialSkills: SkillWithVersions[];
  username: string;
}

export function SkillList({ initialSkills, username }: SkillListProps) {
  const [editingSkill, setEditingSkill] = useState<SkillWithVersions | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta skill?')) return;
    setDeletingId(id);
    await deleteSkillAction(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Skills Publicadas ({initialSkills.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingSkill(null);
            setShowCreate(!showCreate);
          }}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm"
        >
          {showCreate ? 'Cerrar Formulario' : '+ Registrar Nueva Skill'}
        </button>
      </div>

      {showCreate && (
        <SkillForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      )}

      {editingSkill && (
        <SkillForm
          initialData={editingSkill}
          onSuccess={() => setEditingSkill(null)}
          onCancel={() => setEditingSkill(null)}
        />
      )}

      {initialSkills.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No tienes skills registradas todavía. ¡Registra la primera para comenzar!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialSkills.map((skill) => {
            const latestVersion = skill.versions[0]?.version || '0.1.0';

            return (
              <div
                key={skill.id}
                className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      v{latestVersion}
                    </span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {skill.name}
                    </h4>
                    <span className="text-xs text-gray-400 font-mono">
                      ({username}/{skill.slug})
                    </span>
                  </div>

                  {skill.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {skill.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span>📥 {skill.downloadsCount} descargas</span>
                    <span>⚡ {skill.installsCount} instalaciones</span>
                    {skill.license && <span>⚖️ {skill.license}</span>}
                    {skill.repositoryUrl && (
                      <a
                        href={skill.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        GitHub ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/skills/${username}/${skill.slug}`}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded"
                  >
                    Ver en Catálogo
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setEditingSkill(skill);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(skill.id)}
                    disabled={deletingId === skill.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded disabled:opacity-50"
                  >
                    {deletingId === skill.id ? 'Borrando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
