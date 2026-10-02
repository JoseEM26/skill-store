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
      {/* Wide Search Bar */}
      <form onSubmit={handleSubmit} className="relative flex w-full items-center group">
        <span className="pointer-events-none absolute left-4 flex items-center text-outline-variant group-focus-within:text-primary transition-colors">
          <svg
            className="w-5 h-5"
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
        </span>
        <input
          type="text"
          data-testid="search-input"
          placeholder="Buscar por nombre, descripción, tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest py-3.5 pl-12 pr-28 text-sm font-body text-on-surface shadow-xs transition placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 group-hover:border-outline-variant"
        />
        <button
          type="submit"
          data-testid="search-submit"
          className="absolute right-2.5 rounded-lg bg-primary hover:bg-primary-dim px-4 py-2 text-xs font-semibold text-on-primary shadow-xs transition-all active:scale-95"
        >
          {isPending ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Filter Bar with Pill Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1" data-testid="filter-tabs">
        {filterTabs.map((tab) => {
          const isActive = currentType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`filter-tab-${tab.key}`}
              onClick={() => handleTypeChange(tab.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:border-outline-variant hover:bg-surface-container-low'
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

