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
      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex rounded-md shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos ({initialContexts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('idea')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              activeTab === 'idea'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Ideas ({initialContexts.filter((c) => c.type === 'idea').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('external_reference')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              activeTab === 'external_reference'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Referencias ({initialContexts.filter((c) => c.type === 'external_reference').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreateRef(false);
              setEditingContext(null);
              setShowCreateIdea(!showCreateIdea);
            }}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm"
          >
            + Nueva Idea
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateIdea(false);
              setEditingContext(null);
              setShowCreateRef(!showCreateRef);
            }}
            className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-sm"
          >
            + Nueva Referencia
          </button>
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

      {/* Contexts List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No tienes contextos registrados en esta vista.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                      item.type === 'idea'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {item.type === 'idea' ? 'Idea' : 'Referencia'}
                  </span>

                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.isPublic
                        ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {item.isPublic ? 'Pública' : 'Privada'}
                  </span>

                  {item.isArchived && (
                    <span
                      data-testid="archived-badge"
                      className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    >
                      Archivado
                    </span>
                  )}

                  <h4 className="text-base font-bold text-gray-900 dark:text-white">{item.title}</h4>
                </div>

                {item.body && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{item.body}</p>
                )}

                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    🔗 {item.link}
                  </a>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={item.isArchived}
                  onClick={() => {
                    if (item.isArchived) return;
                    setShowCreateIdea(false);
                    setShowCreateRef(false);
                    setEditingContext(item);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={item.isArchived || deletingId === item.id}
                  onClick={() => !item.isArchived && handleDelete(item.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId === item.id ? 'Borrando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
