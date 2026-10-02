import React, { useState, useEffect, useCallback } from 'react';
import type * as InkType from 'ink';
import type TextInputType from 'ink-text-input';
import { callMcpTool, McpCallResult, SkillSummary } from './client';
import { readStoredToken } from './config';
import { handlePull, CommandResult } from './commands';

export interface SkillsTuiProps {
  configPath?: string;
  baseUrl?: string;
  targetBaseDir?: string;
  dir?: string;
  fetchFn?: typeof fetch;
  onExit?: () => void;
  ink?: typeof InkType;
  TextInput?: typeof TextInputType;
}

export const loadEsm = async <T = unknown>(moduleName: string): Promise<T> => {
  try {
    return await (new Function('m', 'return import(m)')(moduleName) as Promise<T>);
  } catch {
    return (await import(/* @vite-ignore */ moduleName)) as T;
  }
};

export function filterSkills(skills: SkillSummary[], query: string): SkillSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter((skill) => {
    const nameMatch = skill.name?.toLowerCase().includes(q);
    const slugMatch = skill.slug?.toLowerCase().includes(q);
    const ownerMatch = skill.owner?.toLowerCase().includes(q);
    const identifierMatch = `${skill.owner}/${skill.slug}`.toLowerCase().includes(q);
    const descMatch = skill.description?.toLowerCase().includes(q);
    return Boolean(nameMatch || slugMatch || ownerMatch || identifierMatch || descMatch);
  });
}

export async function fetchTuiSkills(options?: {
  configPath?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<McpCallResult<SkillSummary[]>> {
  const token = readStoredToken(options?.configPath);
  return callMcpTool<SkillSummary[]>(
    'list_skills',
    {},
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );
}

interface InnerProps extends SkillsTuiProps {
  ink: typeof InkType;
  TextInput: typeof TextInputType;
}

export const SkillsTuiInner: React.FC<InnerProps> = ({
  ink,
  TextInput,
  configPath,
  baseUrl,
  targetBaseDir,
  dir,
  fetchFn,
  onExit,
}) => {
  const { Box, Text, useApp, useInput } = ink;
  const { exit } = useApp();

  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'browsing' | 'pulling' | 'done'>('browsing');
  const [pullResult, setPullResult] = useState<CommandResult<{ targetDir: string; filesWritten: string[] }> | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetchTuiSkills({ configPath, baseUrl, fetchFn });
      if (!isMounted) return;
      if (!res.success || !res.data) {
        setError(res.error || 'Error desconocido al cargar skills');
      } else {
        setSkills(res.data);
      }
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [configPath, baseUrl, fetchFn]);

  const filteredSkills = filterSkills(skills, filterText);

  const handleSelectSkill = useCallback(
    async (skill: SkillSummary) => {
      setStatus('pulling');
      try {
        const res = await handlePull(`${skill.owner}/${skill.slug}`, {
          dir,
          configPath,
          baseUrl,
          targetBaseDir,
          fetchFn,
        });
        setPullResult(res);
        setStatus('done');
        exit();
        onExit?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al descargar';
        setPullResult({ success: false, message: msg, error: msg });
        setStatus('done');
        exit();
        onExit?.();
      }
    },
    [dir, configPath, baseUrl, targetBaseDir, fetchFn, exit, onExit]
  );

  useInput((input, key) => {
    if (status !== 'browsing') return;

    if (key.escape || (input === 'q' && filterText === '')) {
      exit();
      onExit?.();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < filteredSkills.length - 1 ? prev + 1 : prev));
    } else if (key.return) {
      if (filteredSkills.length > 0 && filteredSkills[selectedIndex]) {
        handleSelectSkill(filteredSkills[selectedIndex]);
      }
    }
  });

  const handleFilterChange = (val: string) => {
    setFilterText(val);
    setSelectedIndex(0);
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header Panel */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color="cyan">
          ☁️  CloudCode Skills Registry - TUI
        </Text>
        <Box marginTop={1}>
          <Text bold>🔍 Filtrar: </Text>
          <TextInput
            value={filterText}
            onChange={handleFilterChange}
            placeholder="Escribe para buscar..."
          />
        </Box>
      </Box>

      {/* Main List Panel */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        paddingY={1}
        flexDirection="column"
        marginTop={1}
      >
        {loading && (
          <Text color="yellow">⏳ Cargando skills del registro...</Text>
        )}

        {error && (
          <Text color="red">❌ Error: {error}</Text>
        )}

        {!loading && !error && filteredSkills.length === 0 && (
          <Text color="gray">
            {filterText
              ? `No se encontraron skills que coincidan con "${filterText}".`
              : 'No hay skills disponibles en el registro.'}
          </Text>
        )}

        {!loading &&
          !error &&
          filteredSkills.map((skill, index) => {
            const isSelected = index === selectedIndex;
            const ver = skill.latestVersion?.version
              ? `v${skill.latestVersion.version}`
              : 'sin versión';

            return (
              <Box
                key={`${skill.owner}/${skill.slug}`}
                flexDirection="column"
                marginY={0}
              >
                <Box flexDirection="row">
                  <Text
                    color={isSelected ? 'green' : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? '❯ ' : '  '}
                    {skill.owner}/{skill.slug} ({ver}) - {skill.name}
                  </Text>
                  {!skill.isPublic && (
                    <Text color="yellow" bold>
                      {' '}
                      [Privada]
                    </Text>
                  )}
                  {skill.isPaused && (
                    <Text color="red" bold>
                      {' '}
                      [Pausada]
                    </Text>
                  )}
                </Box>
                {skill.description && (
                  <Box paddingLeft={4}>
                    <Text color="gray" dimColor={!isSelected}>
                      {skill.description}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
      </Box>

      {/* Status / Result Display */}
      {status === 'pulling' && (
        <Box marginTop={1}>
          <Text color="yellow">⏳ Descargando skill...</Text>
        </Box>
      )}

      {pullResult && (
        <Box marginTop={1}>
          <Text color={pullResult.success ? 'green' : 'red'}>
            {pullResult.message}
          </Text>
        </Box>
      )}

      {/* Footer Instructions */}
      <Box
        marginTop={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text color="gray">
          ↑/↓: Navegar | Enter: Descargar (pull) | Esc / q: Salir
        </Text>
        <Text color="gray">
          Total: {filteredSkills.length} skill(s)
        </Text>
      </Box>
    </Box>
  );
};

export const SkillsTui: React.FC<SkillsTuiProps> = (props) => {
  const [modules, setModules] = useState<{
    ink: typeof InkType;
    TextInput: typeof TextInputType;
  } | null>(() => {
    if (props.ink && props.TextInput) {
      return { ink: props.ink, TextInput: props.TextInput };
    }
    return null;
  });

  useEffect(() => {
    if (modules) return;
    let isMounted = true;
    Promise.all([
      loadEsm<typeof InkType>('ink'),
      loadEsm<{ default: typeof TextInputType }>('ink-text-input'),
    ]).then(([ink, ti]) => {
      if (isMounted) {
        setModules({ ink, TextInput: ti.default || (ti as unknown as typeof TextInputType) });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [modules]);

  if (!modules) {
    return null;
  }

  return (
    <SkillsTuiInner
      {...props}
      ink={modules.ink}
      TextInput={modules.TextInput}
    />
  );
};

export async function runSkillsTui(options?: SkillsTuiProps): Promise<void> {
  const React = (await import('react')).default;
  const ink = await loadEsm<typeof InkType>('ink');
  const ti = await loadEsm<{ default: typeof TextInputType }>('ink-text-input');
  const TextInput = ti.default || (ti as unknown as typeof TextInputType);

  const app = ink.render(
    React.createElement(SkillsTuiInner, {
      ...options,
      ink,
      TextInput,
    })
  );
  await app.waitUntilExit();
}
