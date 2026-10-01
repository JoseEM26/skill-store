'use client';

import { useState } from 'react';

interface TokenRevealModalProps {
  rawToken: string;
  label: string;
  onClose: () => void;
}

export function TokenRevealModal({ rawToken, label, onClose }: TokenRevealModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-reveal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔑</span>
            <h3 id="token-reveal-title" className="text-lg font-bold text-gray-900 dark:text-white">
              Token de Acceso Generado
            </h3>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs space-y-1">
          <p className="font-semibold">⚠️ Guarda este token en un lugar seguro.</p>
          <p>
            Por motivos de seguridad, no podrás volver a ver este secreto en texto plano una vez que cierres esta ventana.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Etiqueta: <strong className="text-gray-700 dark:text-gray-200">{label}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={rawToken}
              data-testid="raw-token-input"
              className="w-full font-mono text-xs p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              data-testid="copy-token-btn"
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-md shadow-sm transition shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? '✓ ¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            data-testid="close-token-modal-btn"
            className="px-4 py-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-md"
          >
            Entendido, ya lo he copiado
          </button>
        </div>
      </div>
    </div>
  );
}
