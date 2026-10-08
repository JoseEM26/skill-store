'use client';

import { useState } from 'react';
import type { Skill, SkillGroup, SkillGroupItem } from '@prisma/client';
import type { SkillWithVersions } from '@/lib/admin/skills';
import type { CatalogSkillItem } from '@/lib/catalog/queries';
import {
  createGroupAction,
  renameGroupAction,
  deleteGroupAction,
  addSkillToGroupAction,
  removeSkillFromGroupAction,
} from '@/app/admin/actions';

export type GroupSelectableSkill = (Skill | SkillWithVersions | CatalogSkillItem) & {
  owner?: {
    username: string;
    avatarUrl?: string | null;
  };
  ownerId?: string;
};

export type GroupWithItemsAndCount = SkillGroup & {
  items?: (SkillGroupItem & { skill?: Skill | CatalogSkillItem })[];
  _count?: {
    items: number;
  };
};

export interface GroupListProps {
  initialGroups: GroupWithItemsAndCount[];
  userSkills: (Skill | SkillWithVersions | CatalogSkillItem | GroupSelectableSkill)[];
}

export function GroupList({ initialGroups, userSkills }: GroupListProps) {
  const [groups, setGroups] = useState<GroupWithItemsAndCount[]>(initialGroups);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<GroupWithItemsAndCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingSkill, setTogglingSkill] = useState<{ groupId: string; skillId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreating(true);
    setErrorMessage(null);

    const res = await createGroupAction(newGroupName);
    setIsCreating(false);

    if (res.success && res.data) {
      const created = res.data as SkillGroup;
      const newGroupWithMeta: GroupWithItemsAndCount = {
        ...created,
        items: [],
        _count: { items: 0 },
      };
      setGroups((prev) => [newGroupWithMeta, ...prev]);
      setNewGroupName('');
      setShowCreate(false);
    } else {
      setErrorMessage(res.error || 'Error al crear el grupo');
    }
  };

  const handleStartRename = (group: GroupWithItemsAndCount) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setErrorMessage(null);
  };

  const handleSaveRename = async (groupId: string) => {
    if (!editGroupName.trim()) return;

    setIsRenaming(true);
    setErrorMessage(null);

    const res = await renameGroupAction(groupId, editGroupName);
    setIsRenaming(false);

    if (res.success && res.data) {
      const updated = res.data as SkillGroup;
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, name: updated.name } : g))
      );
      setEditingGroupId(null);
    } else {
      setErrorMessage(res.error || 'Error al renombrar el grupo');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    setIsDeleting(true);
    setErrorMessage(null);

    const res = await deleteGroupAction(deletingGroup.id);
    setIsDeleting(false);

    if (res.success) {
      setGroups((prev) => prev.filter((g) => g.id !== deletingGroup.id));
      setDeletingGroup(null);
    } else {
      setErrorMessage(res.error || 'Error al eliminar el grupo');
    }
  };

  const handleToggleSkillInGroup = async (groupId: string, skillId: string, isCurrentlyInGroup: boolean) => {
    setTogglingSkill({ groupId, skillId });
    setErrorMessage(null);

    if (isCurrentlyInGroup) {
      const res = await removeSkillFromGroupAction(groupId, skillId);
      setTogglingSkill(null);

      if (res.success) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            const updatedItems = (g.items || []).filter((item) => item.skillId !== skillId);
            return {
              ...g,
              items: updatedItems,
              _count: { items: updatedItems.length },
            };
          })
        );
      } else {
        setErrorMessage(res.error || 'Error al quitar la skill del grupo');
      }
    } else {
      const res = await addSkillToGroupAction(groupId, skillId);
      setTogglingSkill(null);

      if (res.success) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            const currentItems = g.items || [];
            if (currentItems.some((item) => item.skillId === skillId)) return g;
            const matchingSkill = userSkills.find((s) => s.id === skillId);
            const newItem: SkillGroupItem & { skill?: Skill | CatalogSkillItem } = {
              groupId,
              skillId,
              addedAt: new Date(),
              skill: matchingSkill as unknown as Skill,
            };
            const updatedItems = [...currentItems, newItem];
            return {
              ...g,
              items: updatedItems,
              _count: { items: updatedItems.length },
            };
          })
        );
      } else {
        setErrorMessage(res.error || 'Error al agregar la skill al grupo');
      }
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-error-container/20 border border-error/20 text-error rounded-xl text-xs flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-error hover:text-error-dim font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Grupos de Skills ({groups.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setShowCreate(!showCreate);
            setErrorMessage(null);
          }}
          className="px-3.5 py-1.5 text-xs bg-primary hover:bg-primary-dim text-on-primary font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          {showCreate ? 'Cerrar Formulario' : '+ Crear Nuevo Grupo'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateGroup}
          aria-label="Crear Nuevo Grupo"
          className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest shadow-xs space-y-4"
        >
          <h4 className="font-headline text-sm font-bold text-on-surface">Crear Nuevo Grupo de Skills</h4>
          <div>
            <label htmlFor="newGroupName" className="block text-xs font-medium text-on-surface mb-1 font-headline">
              Nombre del Grupo
            </label>
            <input
              id="newGroupName"
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="ej. stack-frontend, devops-tools"
              className="w-full px-3 py-2 text-xs rounded-lg border border-surface-container-highest bg-surface-container-low focus:bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewGroupName('');
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !newGroupName.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-dim rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isCreating ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-dashed border-surface-container-highest">
          <p className="font-body text-on-surface-variant text-sm">
            No tienes grupos creados todavía. ¡Crea el primero para comenzar a organizar tus skills en colecciones!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const itemCount = group._count?.items ?? (group.items?.length || 0);
            const isEditing = editingGroupId === group.id;

            return (
              <div
                key={group.id}
                data-testid={`group-card-${group.id}`}
                className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <label htmlFor={`edit-group-name-${group.id}`} className="sr-only">
                          Nombre del grupo
                        </label>
                        <input
                          id={`edit-group-name-${group.id}`}
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface font-mono"
                        />
                        <button
                          type="button"
                          disabled={isRenaming || !editGroupName.trim()}
                          onClick={() => handleSaveRename(group.id)}
                          className="px-3 py-1 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-dim rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isRenaming ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="px-3 py-1 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-mono text-base font-bold text-on-surface">
                          {group.name}
                        </h4>
                        <span
                          data-testid={`group-count-badge-${group.id}`}
                          className="text-xs px-2 py-0.5 rounded font-mono bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim"
                        >
                          {itemCount} {itemCount === 1 ? 'skill' : 'skills'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isEditing && (
                      <button
                        type="button"
                        data-testid={`rename-group-btn-${group.id}`}
                        onClick={() => handleStartRename(group)}
                        className="px-3 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                      >
                        Renombrar
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid={`delete-group-btn-${group.id}`}
                      onClick={() => setDeletingGroup(group)}
                      className="px-3 py-1.5 text-xs font-medium text-error bg-error-container/20 hover:bg-error-container/40 rounded-lg transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="border-t border-surface-container pt-3">
                  <h5 className="font-headline text-xs font-semibold text-on-surface mb-2">
                    Skills en este grupo:
                  </h5>
                  {userSkills.length === 0 ? (
                    <p className="font-body text-xs text-on-surface-variant">
                      No tienes skills registradas todavía para agregar a este grupo.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {userSkills.map((skill) => {
                        const isChecked = (group.items || []).some((item) => item.skillId === skill.id);
                        const isToggling =
                          togglingSkill?.groupId === group.id && togglingSkill?.skillId === skill.id;

                        const ownerId = 'ownerId' in skill ? skill.ownerId : undefined;
                        const ownerObj = 'owner' in skill ? skill.owner : undefined;
                        const ownerUsername = ownerObj?.username;
                        const isOwn = Boolean(ownerId && group.ownerId && ownerId === group.ownerId);

                        return (
                          <label
                            key={skill.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary-container/20 border-primary-fixed-dim text-on-surface'
                                : 'bg-surface-container-low border-surface-container-highest text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isToggling}
                                onChange={() => handleToggleSkillInGroup(group.id, skill.id, isChecked)}
                                data-testid={`skill-checkbox-${group.id}-${skill.id}`}
                                aria-label={`Incluir skill ${skill.name} en grupo ${group.name}`}
                                className="rounded border-surface-container-highest text-primary focus:ring-primary shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0 flex flex-col">
                                <span className="truncate font-medium font-mono text-on-surface">{skill.name}</span>
                                <span className="text-[10px] text-outline font-mono truncate">
                                  {ownerUsername ? `${ownerUsername}/${skill.slug}` : skill.slug}
                                </span>
                              </div>
                            </div>
                            {isOwn ? (
                              <span
                                data-testid={`skill-badge-own-${skill.id}`}
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-surface-container text-on-surface-variant border border-surface-container-highest shrink-0"
                              >
                                propia
                              </span>
                            ) : (
                              <span
                                data-testid={`skill-badge-public-${skill.id}`}
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary-fixed-dim shrink-0"
                              >
                                {ownerUsername ? `@${ownerUsername}` : 'pública'}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deletingGroup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-group-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 border border-surface-container-highest space-y-4">
            <div className="flex items-center space-x-2 border-b pb-3 border-surface-container">
              <span className="text-xl">⚠️</span>
              <h3 id="delete-group-modal-title" className="font-headline text-lg font-bold text-on-surface">
                Confirmar eliminación de grupo
              </h3>
            </div>

            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>
                ¿Estás seguro de que deseas eliminar el grupo{' '}
                <strong className="font-semibold text-on-surface">{deletingGroup.name}</strong>?
              </p>
              <div className="p-3.5 bg-secondary-fixed/50 border border-secondary-fixed-dim text-on-secondary-fixed rounded-lg text-xs space-y-1">
                <p className="font-semibold">Información:</p>
                <p>
                  Las skills contenidas en este grupo no serán eliminadas del registro, únicamente desaparecerá la colección.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-surface-container">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingGroup(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="confirm-delete-group-btn"
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
