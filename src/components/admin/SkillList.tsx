'use client';

import { useState } from 'react';
import type { SkillWithVersions } from '@/lib/admin/skills';
import { deleteSkillAction, updateSkillAction } from '@/app/admin/actions';
import { SkillForm } from './SkillForm';
import Link from 'next/link';

interface SkillListProps {
  initialSkills: SkillWithVersions[];
  username: string;
}

export function SkillList({ initialSkills, username }: SkillListProps) {
  const [editingSkill, setEditingSkill] = useState<SkillWithVersions | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState<SkillWithVersions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleVisibility = async (skill: SkillWithVersions) => {
    setUpdatingId(skill.id);
    await updateSkillAction({
      id: skill.id,
      isPublic: !skill.isPublic,
    });
    setUpdatingId(null);
  };

  const handleTogglePaused = async (skill: SkillWithVersions) => {
    setUpdatingId(skill.id);
    await updateSkillAction({
      id: skill.id,
      isPaused: !skill.isPaused,
    });
    setUpdatingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSkill) return;
    setIsDeleting(true);
    await deleteSkillAction(deletingSkill.id);
    setIsDeleting(false);
    setDeletingSkill(null);
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
                    <span
                      data-testid="visibility-badge"
                      className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                        skill.isPublic
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {skill.isPublic ? 'Pública' : 'Privada'}
                    </span>
                    {skill.isPaused && (
                      <span
                        data-testid="paused-badge"
                        className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      >
                        Pausada
                      </span>
                    )}
                    {skill.isArchived && (
                      <span
                        data-testid="archived-badge"
                        className="text-xs px-2 py-0.5 rounded font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800"
                      >
                        Archivado
                      </span>
                    )}
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

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    href={`/skills/${username}/${skill.slug}`}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded"
                  >
                    Ver en Catálogo
                  </Link>
                  <button
                    type="button"
                    data-testid={`toggle-visibility-${skill.id}`}
                    disabled={skill.isArchived || updatingId === skill.id}
                    onClick={() => handleToggleVisibility(skill)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {skill.isPublic ? 'Hacer privada' : 'Hacer pública'}
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-paused-${skill.id}`}
                    disabled={skill.isArchived || updatingId === skill.id}
                    onClick={() => handleTogglePaused(skill)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {skill.isPaused ? 'Reanudar' : 'Pausar'}
                  </button>
                  <button
                    type="button"
                    disabled={skill.isArchived}
                    onClick={() => {
                      if (skill.isArchived) return;
                      setShowCreate(false);
                      setEditingSkill(skill);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-btn-${skill.id}`}
                    disabled={skill.isArchived}
                    onClick={() => {
                      if (skill.isArchived) return;
                      setDeletingSkill(skill);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deletingSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center space-x-2 border-b pb-3 border-gray-100 dark:border-gray-800">
              <span className="text-xl">⚠️</span>
              <h3 id="delete-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmar eliminación
              </h3>
            </div>

            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente la skill{' '}
                <strong className="font-semibold text-gray-900 dark:text-white">{deletingSkill.name}</strong>?
              </p>

              {deletingSkill.isPublic ? (
                <div
                  data-testid="delete-public-warning"
                  className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs space-y-1"
                >
                  <p className="font-semibold">Advertencia para skill pública:</p>
                  <p>
                    Esta skill es pública. Se eliminará del registro, pero quienes ya la descargaron o instalaron conservan su copia local (el registro no puede revocar copias ya distribuidas).
                  </p>
                </div>
              ) : (
                <div
                  data-testid="delete-private-warning"
                  className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 rounded-lg text-xs space-y-1"
                >
                  <p className="font-semibold">Advertencia para skill privada:</p>
                  <p>
                    Esta skill es privada. Se eliminará del registro y, al no haber estado nunca en el catálogo público, no hay copias de terceros que considerar.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingSkill(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="confirm-delete-btn"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
