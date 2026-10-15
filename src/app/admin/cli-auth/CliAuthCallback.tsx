'use client';

import { useEffect, useState } from 'react';

interface CliAuthCallbackProps {
  port: number;
  state: string;
  rawToken: string;
}

export function CliAuthCallback({ port, state, rawToken }: CliAuthCallbackProps) {
  const [status, setStatus] = useState<'sending' | 'success' | 'error'>('sending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function sendToken() {
      try {
        const response = await fetch(`http://localhost:${port}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: rawToken,
            state,
          }),
        });

        if (!response.ok) {
          throw new Error(`El CLI respondió con código HTTP ${response.status}`);
        }

        if (isMounted) {
          setStatus('success');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'No se pudo establecer conexión con el servidor local del CLI.'
          );
        }
      }
    }

    sendToken();

    return () => {
      isMounted = false;
    };
  }, [port, state, rawToken]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`cloudcode login --token ${rawToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'sending') {
    return (
      <div className="text-center py-6">
        <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
        <h2 className="font-headline text-base font-semibold text-on-surface mb-1">
          Conectando con el CLI de CloudCode...
        </h2>
        <p className="font-body text-xs text-on-surface-variant">
          Enviando credenciales de autorización a tu terminal (puerto {port}).
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-headline text-lg font-bold text-on-surface mb-1">
          Listo, podés cerrar esta pestaña.
        </h2>
        <p className="font-body text-xs text-on-surface-variant">
          La sesión en tu terminal se inició correctamente. Ya podés volver a la consola.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-error/10 border border-error/20 text-on-surface">
        <span className="text-xl">⚠️</span>
        <div>
          <h3 className="font-headline text-sm font-semibold text-error">
            No se pudo conectar con el CLI
          </h3>
          <p className="font-body text-xs text-on-surface-variant mt-0.5">
            {errorMessage || 'El servidor local del CLI no respondió.'} Es posible que el tiempo de espera haya expirado o la terminal se haya cerrado.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container border border-surface-container-highest space-y-2">
        <p className="font-body text-xs text-on-surface font-medium">
          Podés iniciar sesión manualmente corriendo este comando en tu terminal:
        </p>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest font-mono text-xs overflow-x-auto">
          <code className="text-primary truncate">cloudcode login --token {rawToken}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-2.5 py-1 text-xs rounded-md bg-primary hover:bg-primary-dim text-on-primary font-medium transition-colors cursor-pointer"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
