'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';

export function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentType = searchParams.get('type') || 'all';

  const [searchTerm, setSearchTerm] = useState(currentQ);

  const applyFilters = (newQ: string, newType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newQ.trim()) {
      params.set('q', newQ.trim());
    } else {
      params.delete('q');
    }

    if (newType && newType !== 'all') {
      params.set('type', newType);
    } else {
      params.delete('type');
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    applyFilters(searchTerm, currentType);
  };

  const handleTypeChange = (type: string) => {
    applyFilters(searchTerm, type);
  };

  const filterTabs = [
    { key: 'all', label: 'Todos' },
    { key: 'skills', label: 'Skills' },
    { key: 'contexts', label: 'Contextos' },
    { key: 'ideas', label: 'Ideas' },
    { key: 'external_references', label: 'Referencias' },
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative flex w-full items-center">
        <input
          type="text"
          data-testid="search-input"
          placeholder="Buscar por nombre, descripción, tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pl-11 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <div className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="submit"
          data-testid="search-submit"
          className="absolute right-2 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5" data-testid="filter-tabs">
        {filterTabs.map((tab) => {
          const isActive = currentType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`filter-tab-${tab.key}`}
              onClick={() => handleTypeChange(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
