'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOutAction } from '@/lib/auth/actions';

export interface UserMenuUser {
  id?: string;
  name?: string | null;
  username?: string | null;
  githubId?: string | null;
  image?: string | null;
  email?: string | null;
}

export interface UserMenuProps {
  user: UserMenuUser | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dim text-on-primary text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-150 shadow-sm active:scale-95"
      >
        <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        <span>Sign in with GitHub</span>
      </Link>
    );
  }

  const displayName = user.username || user.name || 'Usuario';
  const displayInitial = (user.username || user.name || '?')[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="user-menu-trigger"
        className="inline-flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-surface-container-highest transition-all duration-150 shadow-sm cursor-pointer"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={displayName}
            className="w-5 h-5 rounded-full object-cover border border-surface-container-highest"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
            {displayInitial}
          </div>
        )}
        <span className="font-medium text-xs text-on-surface truncate max-w-[120px]">
          {displayName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-on-surface-variant transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          data-testid="user-menu-dropdown"
          className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-1 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-surface-container-highest mb-1">
            <p className="text-xs font-semibold text-on-surface truncate">
              {user.name || user.username || 'Usuario'}
            </p>
            {user.username && (
              <p className="text-[11px] text-on-surface-variant truncate font-mono">
                @{user.username}
              </p>
            )}
          </div>

          {/* Option a: Ver perfil */}
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4 text-on-surface-variant shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Ver perfil</span>
          </Link>

          {/* Option b: Panel de Administración */}
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4 text-on-surface-variant shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Panel de Administración</span>
          </Link>

          {/* Divider */}
          <div className="border-t border-surface-container-highest my-1"></div>

          {/* Option c: Cerrar sesión */}
          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
