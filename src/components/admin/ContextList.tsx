'use client';

import { useState } from 'react';
import type { Context } from '@prisma/client';
import { deleteContextAction } from '@/app/admin/actions';
import { IdeaForm } from './IdeaForm';
import { ExternalReferenceForm } from './ExternalReferenceForm';

interface ContextListProps {
  initialContexts: Context[];
}

export function ContextList({ initialContexts }: ContextListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'idea' | 'external_reference'>('all');
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [showCreateIdea, setShowCreateIdea] = useState(false);
  const [showCreateRef, setShowCreateRef] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = initialContexts.filter((c) => {
    if (activeTab === 'all') return true;
    return c.type === activeTab;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este contexto?')) return;
    setDeletingId(id);
    await deleteContextAction(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Actions & Filters Cluster */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span>Todos ({initialContexts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('idea')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'idea'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span>Ideas ({initialContexts.filter((c) => c.type === 'idea').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('external_reference')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'external_reference'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span>Referencias ({initialContexts.filter((c) => c.type === 'external_reference').length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowCreateRef(false);
                setEditingContext(null);
                setShowCreateIdea(!showCreateIdea);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-container-highest bg-surface-container-lowest hover:bg-surface-container text-on-surface shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <span>+ Nueva Idea</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateIdea(false);
                setEditingContext(null);
                setShowCreateRef(!showCreateRef);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-dim shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>+ Nueva Referencia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modals/Drawers */}
      {showCreateIdea && (
        <IdeaForm onSuccess={() => setShowCreateIdea(false)} onCancel={() => setShowCreateIdea(false)} />
      )}

      {showCreateRef && (
        <ExternalReferenceForm
          onSuccess={() => setShowCreateRef(false)}
          onCancel={() => setShowCreateRef(false)}
        />
      )}

      {editingContext && editingContext.type === 'idea' && (
        <IdeaForm
          initialData={editingContext}
          onSuccess={() => setEditingContext(null)}
          onCancel={() => setEditingContext(null)}
        />
      )}

      {editingContext && editingContext.type === 'external_reference' && (
        <ExternalReferenceForm
          initialData={editingContext}
          onSuccess={() => setEditingContext(null)}
          onCancel={() => setEditingContext(null)}
        />
      )}

      {/* Contexts Data Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-dashed border-surface-container-highest">
          <p className="text-on-surface-variant text-sm">
            No tienes contextos registrados en esta vista.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-highest bg-surface-container-low/50 text-[11px] font-mono font-medium text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4" scope="col">Nombre y descripción</th>
                  <th className="py-3 px-3" scope="col">Tipo</th>
                  <th className="py-3 px-3" scope="col">Visibilidad</th>
                  <th className="py-3 px-3" scope="col">Etiquetas / Tags</th>
                  <th className="py-3 px-4 text-right" scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/70 text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors group">
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-surface-container-high text-primary shrink-0 mt-0.5 text-sm">
                          {item.type === 'idea' ? '💡' : '🔗'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-on-surface text-xs">
                              {item.title}
                            </span>
                          </div>
                          {item.body && (
                            <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">
                              {item.body}
                            </p>
                          )}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1 mt-1 truncate max-w-xs"
                            >
                              🔗 {item.link}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          item.type === 'idea'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim'
                        }`}
                      >
                        {item.type === 'idea' ? 'Idea' : 'Referencia'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.isPublic
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-surface-container text-on-surface-variant border border-surface-container-highest'
                          }`}
                        >
                          {item.isPublic ? 'Pública' : 'Privada'}
                        </span>
                        {item.isArchived && (
                          <span
                            data-testid="archived-badge"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
                          >
                            Archivado
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant border border-surface-container-highest"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-outline text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={item.isArchived}
                          onClick={() => {
                            if (item.isArchived) return;
                            setShowCreateIdea(false);
                            setShowCreateRef(false);
                            setEditingContext(item);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={item.isArchived || deletingId === item.id}
                          onClick={() => !item.isArchived && handleDelete(item.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-error hover:bg-error-container/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {deletingId === item.id ? 'Borrando...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

