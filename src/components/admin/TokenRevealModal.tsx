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
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 border border-surface-container-highest space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-3 border-surface-container">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔑</span>
            <h3 id="token-reveal-title" className="font-headline text-lg font-bold text-on-surface">
              Token de Acceso Generado
            </h3>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
          <p className="font-semibold">⚠️ Guarda este token en un lugar seguro.</p>
          <p>
            Por motivos de seguridad, no podrás volver a ver este secreto en texto plano una vez que cierres esta ventana.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-body">
            <span>Etiqueta: <strong className="text-on-surface font-semibold">{label}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={rawToken}
              data-testid="raw-token-input"
              className="w-full font-mono text-xs p-2.5 bg-surface-container-low border border-surface-container-highest rounded-lg text-on-surface select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              data-testid="copy-token-btn"
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary hover:bg-primary-dim text-on-primary'
              }`}
            >
              {copied ? '✓ ¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            data-testid="close-token-modal-btn"
            className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-dim text-on-primary rounded-lg transition-colors cursor-pointer"
          >
            Entendido, ya lo he copiado
          </button>
        </div>
      </div>
    </div>
  );
}
