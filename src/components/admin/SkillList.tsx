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
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Skills Publicadas ({initialSkills.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingSkill(null);
            setShowCreate(!showCreate);
          }}
          className="px-3.5 py-1.5 text-xs bg-primary hover:bg-primary-dim text-on-primary font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
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
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-dashed border-surface-container-highest">
          <p className="font-body text-on-surface-variant text-sm">
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
                className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim">
                      v{latestVersion}
                    </span>
                    <span
                      data-testid="visibility-badge"
                      className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                        skill.isPublic
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-surface-container text-on-surface-variant border-surface-container-highest'
                      }`}
                    >
                      {skill.isPublic ? 'Pública' : 'Privada'}
                    </span>
                    {skill.isPaused && (
                      <span
                        data-testid="paused-badge"
                        className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300"
                      >
                        Pausada
                      </span>
                    )}
                    {skill.isArchived && (
                      <span
                        data-testid="archived-badge"
                        className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300"
                      >
                        Archivado
                      </span>
                    )}
                    <h4 className="font-mono text-base font-bold text-on-surface">
                      {skill.name}
                    </h4>
                    <span className="text-xs text-outline font-mono">
                      ({username}/{skill.slug})
                    </span>
                  </div>

                  {skill.description && (
                    <p className="font-body text-sm text-on-surface-variant line-clamp-2">
                      {skill.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-1">
                    <span>📥 {skill.downloadsCount} descargas</span>
                    <span>⚡ {skill.installsCount} instalaciones</span>
                    {skill.license && <span>⚖️ {skill.license}</span>}
                    {skill.repositoryUrl && (
                      <a
                        href={skill.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        GitHub ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    href={`/skills/${username}/${skill.slug}`}
                    className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary-container/30 hover:bg-primary-container/50 rounded-lg transition-colors"
                  >
                    Ver en Catálogo
                  </Link>
                  <button
                    type="button"
                    data-testid={`toggle-visibility-${skill.id}`}
                    disabled={skill.isArchived || updatingId === skill.id}
                    onClick={() => handleToggleVisibility(skill)}
                    className="px-3 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {skill.isPublic ? 'Hacer privada' : 'Hacer pública'}
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-paused-${skill.id}`}
                    disabled={skill.isArchived || updatingId === skill.id}
                    onClick={() => handleTogglePaused(skill)}
                    className="px-3 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-medium text-error bg-error-container/20 hover:bg-error-container/40 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 border border-surface-container-highest space-y-4">
            <div className="flex items-center space-x-2 border-b pb-3 border-surface-container">
              <span className="text-xl">⚠️</span>
              <h3 id="delete-modal-title" className="font-headline text-lg font-bold text-on-surface">
                Confirmar eliminación
              </h3>
            </div>

            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente la skill{' '}
                <strong className="font-semibold text-on-surface">{deletingSkill.name}</strong>?
              </p>

              {deletingSkill.isPublic ? (
                <div
                  data-testid="delete-public-warning"
                  className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs space-y-1"
                >
                  <p className="font-semibold">Advertencia para skill pública:</p>
                  <p>
                    Esta skill es pública. Se eliminará del registro, pero quienes ya la descargaron o instalaron conservan su copia local (el registro no puede revocar copias ya distribuidas).
                  </p>
                </div>
              ) : (
                <div
                  data-testid="delete-private-warning"
                  className="p-3.5 bg-secondary-fixed/50 border border-secondary-fixed-dim text-on-secondary-fixed rounded-lg text-xs space-y-1"
                >
                  <p className="font-semibold">Advertencia para skill privada:</p>
                  <p>
                    Esta skill es privada. Se eliminará del registro y, al no haber estado nunca en el catálogo público, no hay copias de terceros que considerar.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-surface-container">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingSkill(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="confirm-delete-btn"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-medium text-on-error bg-error hover:bg-error-dim rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
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
