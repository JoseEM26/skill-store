import React, { useState, useEffect, useCallback } from 'react';
import type * as InkType from 'ink';
import type TextInputType from 'ink-text-input';
import { callMcpTool, McpCallResult, SkillSummary, GroupSummary, MySetupData, getRegistryUrl } from './client';
import { readStoredToken, clearStoredToken } from './config';
import { handlePull, handlePullGroup } from './commands';

export type TuiMode = 'menu' | 'skills' | 'groups';
export type SkillCategory = 'all' | 'my-public' | 'my-private' | 'community';

export interface MenuItem {
  id: 'all' | 'my-public' | 'my-private' | 'community' | 'groups' | 'login' | 'logout' | 'exit';
  label: string;
}

export function getMenuItems(isLoggedIn: boolean): MenuItem[] {
  return [
    { id: 'all', label: '🔍 Explorar todas' },
    { id: 'my-public', label: '👤 Mis skills públicas' },
    { id: 'my-private', label: '🔒 Mis skills privadas' },
    { id: 'community', label: '🌐 Skills públicas de la comunidad' },
    { id: 'groups', label: '📦 Grupos' },
    isLoggedIn
      ? { id: 'logout', label: '🚪 Cerrar sesión' }
      : { id: 'login', label: '🔑 Iniciar sesión' },
    { id: 'exit', label: 'Salir' },
  ];
}

export const MENU_ITEMS: MenuItem[] = getMenuItems(false);

export const BANNER_ASCII: string[] = [
  ' █████╗ ██╗     █████╗ ██╗  ██╗██████╗  █████╗  █████╗ ██████╗ ██████╗',
  '██╔═══╝ ██║    ██╔══██╗██║  ██║██╔══██╗██╔═══╝ ██╔══██╗██╔══██╗██╔═══╝',
  '██║     ██║    ██║  ██║██║  ██║██║  ██║██║     ██║  ██║██║  ██║█████╗ ',
  '██║     ██║    ██║  ██║██║  ██║██║  ██║██║     ██║  ██║██║  ██║██╔══╝ ',
  '╚█████╗ ██████╗╚█████╔╝╚█████╔╝██████╔╝╚█████╗ ╚█████╔╝██████╔╝██████╗',
  ' ╚════╝ ╚═════╝ ╚════╝  ╚════╝ ╚═════╝  ╚════╝  ╚════╝ ╚═════╝ ╚═════╝',
];

export interface SkillsTuiProps {
  configPath?: string;
  baseUrl?: string;
  targetBaseDir?: string;
  dir?: string;
  fetchFn?: typeof fetch;
  onExit?: () => void;
  ink?: typeof InkType;
  TextInput?: typeof TextInputType;
  initialMode?: TuiMode;
  initialCategory?: SkillCategory;
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

export function filterGroups(groups: GroupSummary[], query: string): GroupSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((group) => {
    const nameMatch = group.name?.toLowerCase().includes(q);
    return Boolean(nameMatch);
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

export async function fetchTuiMySetup(options?: {
  configPath?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<McpCallResult<MySetupData>> {
  const token = readStoredToken(options?.configPath);
  if (!token && !options?.fetchFn) {
    return {
      success: false,
      error: 'No hay sesión activa.',
    };
  }
  return callMcpTool<MySetupData>(
    'get_my_setup',
    {},
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );
}

export async function fetchTuiGroups(options?: {
  configPath?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<McpCallResult<GroupSummary[]>> {
  const token = readStoredToken(options?.configPath);
  return callMcpTool<GroupSummary[]>(
    'list_groups',
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
  initialMode = 'menu',
  initialCategory = 'all',
}) => {
  const { Box, Text, useApp, useInput } = ink;
  const { exit } = useApp();

  const [mode, setMode] = useState<TuiMode>(initialMode);
  const [category, setCategory] = useState<SkillCategory>(initialCategory);
  const [menuIndex, setMenuIndex] = useState(0);

  const isLoggedIn = !!readStoredToken(configPath);
  const menuItems = React.useMemo(() => getMenuItems(isLoggedIn), [isLoggedIn]);

  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [mySetup, setMySetup] = useState<MySetupData | null>(null);
  const [mySetupError, setMySetupError] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'browsing' | 'pulling' | 'done'>('browsing');
  const [pullResults, setPullResults] = useState<Array<{ success: boolean; message: string; error?: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setLoading(true);
      setError(null);
      const [skillsRes, mySetupRes] = await Promise.all([
        fetchTuiSkills({ configPath, baseUrl, fetchFn }),
        fetchTuiMySetup({ configPath, baseUrl, fetchFn }),
      ]);
      if (!isMounted) return;
      if (!skillsRes.success || !skillsRes.data) {
        setError(skillsRes.error || 'Error desconocido al cargar skills');
      } else {
        setSkills(skillsRes.data);
      }
      if (mySetupRes.success && mySetupRes.data) {
        setMySetup(mySetupRes.data);
      } else {
        setMySetupError(mySetupRes.error || 'No se pudo obtener la sesión');
      }
      setLoading(false);
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [configPath, baseUrl, fetchFn]);

  useEffect(() => {
    if (mode === 'groups' && !groupsLoaded) {
      let isMounted = true;
      async function loadGroups() {
        setLoading(true);
        setError(null);
        const res = await fetchTuiGroups({ configPath, baseUrl, fetchFn });
        if (!isMounted) return;
        if (!res.success || !res.data) {
          setError(res.error || 'Error desconocido al cargar grupos');
        } else {
          setGroups(res.data);
        }
        setGroupsLoaded(true);
        setLoading(false);
      }
      loadGroups();
      return () => {
        isMounted = false;
      };
    }
  }, [mode, groupsLoaded, configPath, baseUrl, fetchFn]);

  const isMenuMode = mode === 'menu';
  const isGroupMode = mode === 'groups';

  const getActiveSkills = useCallback((): SkillSummary[] => {
    switch (category) {
      case 'my-public':
        return (mySetup?.skills || []).filter((s) => s.isPublic);
      case 'my-private':
        return (mySetup?.skills || []).filter((s) => !s.isPublic);
      case 'community': {
        const myUsername = mySetup?.user?.username;
        return skills.filter(
          (s) => s.isPublic && !s.isPaused && (!myUsername || s.owner !== myUsername)
        );
      }
      case 'all':
      default:
        return skills;
    }
  }, [category, mySetup, skills]);

  const activeSkills = getActiveSkills();
  const filteredSkills = filterSkills(activeSkills, filterText);
  const filteredGroups = filterGroups(groups, filterText);
  const totalItems = isMenuMode
    ? menuItems.length
    : isGroupMode
    ? filteredGroups.length
    : filteredSkills.length;
  const safeSelectedIndex = totalItems > 0 ? Math.min(Math.max(0, selectedIndex), totalItems - 1) : 0;
  const windowStart = totalItems > 0 ? Math.max(0, Math.min(safeSelectedIndex - 2, Math.max(0, totalItems - 5))) : 0;
  const visibleSkills = filteredSkills.slice(windowStart, windowStart + 5);
  const visibleGroups = filteredGroups.slice(windowStart, windowStart + 5);
  const windowEnd = Math.min(windowStart + 5, totalItems);
  const positionText = totalItems > 0 ? `${windowStart + 1}-${windowEnd} de ${totalItems}` : '0 de 0';

  const handlePullSkills = useCallback(
    async (keys: string[]) => {
      setStatus('pulling');
      const results: Array<{ success: boolean; message: string; error?: string }> = [];
      try {
        for (const key of keys) {
          const res = await handlePull(key, {
            dir,
            configPath,
            baseUrl,
            targetBaseDir,
            fetchFn,
          });
          results.push(res);
        }
        setPullResults(results);
        setStatus('done');
        exit();
        onExit?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al descargar';
        results.push({ success: false, message: msg, error: msg });
        setPullResults(results);
        setStatus('done');
        exit();
        onExit?.();
      }
    },
    [dir, configPath, baseUrl, targetBaseDir, fetchFn, exit, onExit]
  );

  const handlePullGroupAction = useCallback(
    async (groupName: string) => {
      setStatus('pulling');
      const results: Array<{ success: boolean; message: string; error?: string }> = [];
      try {
        const res = await handlePullGroup(groupName, {
          dir,
          configPath,
          baseUrl,
          targetBaseDir,
          fetchFn,
        });
        results.push(res);
        setPullResults(results);
        setStatus('done');
        exit();
        onExit?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al descargar grupo';
        results.push({ success: false, message: msg, error: msg });
        setPullResults(results);
        setStatus('done');
        exit();
        onExit?.();
      }
    },
    [dir, configPath, baseUrl, targetBaseDir, fetchFn, exit, onExit]
  );

  const displayError =
    mode === 'skills' && (category === 'my-public' || category === 'my-private') && !mySetup
      ? mySetupError || 'No hay sesión activa.'
      : error;

  const getEmptyMessage = () => {
    if (filterText) {
      return isGroupMode
        ? `No se encontraron grupos que coincidan con "${filterText}".`
        : `No se encontraron skills que coincidan con "${filterText}".`;
    }
    if (isGroupMode) {
      return 'No tienes grupos creados en tu cuenta.';
    }
    switch (category) {
      case 'my-public':
        return 'No tienes skills públicas registradas.';
      case 'my-private':
        return 'No tienes skills privadas registradas.';
      case 'community':
        return 'No hay skills de la comunidad disponibles.';
      case 'all':
      default:
        return 'No hay skills disponibles en el registro.';
    }
  };

  const getHeaderTitle = () => {
    if (isMenuMode) {
      return '☁️  CloudCode Skills Registry - Menú Principal';
    }
    if (isGroupMode) {
      return '📂 CloudCode Skills Registry - Grupos';
    }
    switch (category) {
      case 'my-public':
        return '👤 CloudCode Skills Registry - TUI (Mis skills públicas)';
      case 'my-private':
        return '🔒 CloudCode Skills Registry - TUI (Mis skills privadas)';
      case 'community':
        return '🌐 CloudCode Skills Registry - TUI (Skills de la comunidad)';
      case 'all':
      default:
        return '☁️  CloudCode Skills Registry - TUI';
    }
  };

  useInput((input, key) => {
    if (status !== 'browsing') return;

    if (isMenuMode) {
      if (key.escape || input === 'q') {
        exit();
        onExit?.();
        return;
      }

      if (key.upArrow) {
        setMenuIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (key.downArrow) {
        setMenuIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : prev));
      } else if (key.return) {
        const item = menuItems[menuIndex];
        if (item.id === 'exit') {
          exit();
          onExit?.();
          return;
        }
        if (item.id === 'login') {
          const regUrl = getRegistryUrl(baseUrl);
          setPullResults([
            {
              success: true,
              message: `Para iniciar sesión corré: cloudcode login --token <tu_token>\nGenerá un token en ${regUrl}/admin/tokens si no tenés uno.`,
            },
          ]);
          setStatus('done');
          setTimeout(() => {
            exit();
            onExit?.();
          }, 10);
          return;
        }
        if (item.id === 'logout') {
          clearStoredToken(configPath);
          setPullResults([
            {
              success: true,
              message: 'Sesión cerrada correctamente.',
            },
          ]);
          setStatus('done');
          setTimeout(() => {
            exit();
            onExit?.();
          }, 10);
          return;
        }
        if (item.id === 'groups') {
          setMode('groups');
          setFilterText('');
          setSelectedIndex(0);
          return;
        }
        setCategory(item.id);
        setMode('skills');
        setFilterText('');
        setSelectedIndex(0);
        setSelectedKeys(new Set());
      }
      return;
    }

    if (key.escape || (input === 'q' && filterText === '')) {
      setMode('menu');
      setFilterText('');
      setSelectedIndex(0);
      setSelectedKeys(new Set());
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (key.tab || input === '\t') {
      if (!isGroupMode && filteredSkills.length > 0 && filteredSkills[safeSelectedIndex]) {
        const skill = filteredSkills[safeSelectedIndex];
        const skillKey = `${skill.owner}/${skill.slug}`;
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          if (next.has(skillKey)) {
            next.delete(skillKey);
          } else {
            next.add(skillKey);
          }
          return next;
        });
      }
    } else if (key.return) {
      if (isGroupMode) {
        if (filteredGroups.length > 0 && filteredGroups[safeSelectedIndex]) {
          const item = filteredGroups[safeSelectedIndex];
          handlePullGroupAction(item.name);
        }
      } else {
        if (selectedKeys.size > 0) {
          handlePullSkills(Array.from(selectedKeys));
        } else if (filteredSkills.length > 0 && filteredSkills[safeSelectedIndex]) {
          const item = filteredSkills[safeSelectedIndex];
          handlePullSkills([`${item.owner}/${item.slug}`]);
        }
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
        borderColor={isGroupMode ? 'magenta' : 'cyan'}
        paddingX={1}
        flexDirection="column"
      >
        {isMenuMode ? (
          <Box flexDirection="column">
            {BANNER_ASCII.map((line, idx) => (
              <Text key={idx} bold color="cyan">
                {line}
              </Text>
            ))}
            <Box marginTop={1}>
              <Text bold color="cyan">
                {getHeaderTitle()}
              </Text>
            </Box>
          </Box>
        ) : (
          <Text bold color={isGroupMode ? 'magenta' : 'cyan'}>
            {getHeaderTitle()}
          </Text>
        )}
        {!isMenuMode && (
          <Box marginTop={1}>
            <Text bold>🔍 Filtrar: </Text>
            <TextInput
              value={filterText}
              onChange={handleFilterChange}
              placeholder={isGroupMode ? 'Buscar grupos...' : 'Escribe para buscar...'}
            />
          </Box>
        )}
      </Box>

      {/* Main Panel */}
      {isMenuMode ? (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          paddingY={1}
          flexDirection="column"
          marginTop={1}
        >
          {menuItems.map((item, index) => {
            const isSelected = index === menuIndex;
            return (
              <Box key={item.id} flexDirection="row" marginY={0}>
                <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                  {isSelected ? '❯ ' : '  '}
                  {item.label}
                </Text>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          paddingY={1}
          flexDirection="column"
          marginTop={1}
        >
          {loading && (
            <Text color="yellow">
              {isGroupMode ? '⏳ Cargando grupos del usuario...' : '⏳ Cargando skills del registro...'}
            </Text>
          )}

          {displayError && (
            <Text color="red">❌ Error: {displayError}</Text>
          )}

          {!loading && !displayError && totalItems === 0 && (
            <Text color="gray">{getEmptyMessage()}</Text>
          )}

          {!loading &&
            !displayError &&
            !isGroupMode &&
            visibleSkills.map((skill, localIndex) => {
              const globalIndex = windowStart + localIndex;
              const isSelected = globalIndex === safeSelectedIndex;
              const skillKey = `${skill.owner}/${skill.slug}`;
              const isMarked = selectedKeys.has(skillKey);
              const ver = skill.latestVersion?.version
                ? `v${skill.latestVersion.version}`
                : 'sin versión';

              return (
                <Box
                  key={skillKey}
                  flexDirection="column"
                  marginY={0}
                >
                  <Box flexDirection="row">
                    <Text
                      color={isSelected ? 'green' : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? '❯ ' : '  '}
                      {isMarked ? '[x] ' : '[ ] '}
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

          {!loading &&
            !displayError &&
            isGroupMode &&
            visibleGroups.map((group, localIndex) => {
              const globalIndex = windowStart + localIndex;
              const isSelected = globalIndex === safeSelectedIndex;
              const countStr = group.skillsCount === 1 ? '1 skill' : `${group.skillsCount} skills`;

              return (
                <Box
                  key={group.id || group.name}
                  flexDirection="column"
                  marginY={0}
                >
                  <Box flexDirection="row">
                    <Text
                      color={isSelected ? 'magenta' : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? '❯ ' : '  '}
                      📦 {group.name} ({countStr})
                    </Text>
                  </Box>
                </Box>
              );
            })}
        </Box>
      )}

      {/* Status / Result Display */}
      {status === 'pulling' && (
        <Box marginTop={1}>
          <Text color="yellow">
            {isGroupMode ? '⏳ Descargando grupo de skills...' : '⏳ Descargando skill(s)...'}
          </Text>
        </Box>
      )}

      {pullResults.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {pullResults.map((res, index) => (
            <Text key={index} color={res.success ? 'green' : 'red'}>
              {res.message}
            </Text>
          ))}
        </Box>
      )}

      {/* Footer Instructions */}
      <Box
        marginTop={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text color="gray">
          {isMenuMode
            ? '↑/↓: Navegar | Enter: Entrar | Esc/q: Salir'
            : isGroupMode
            ? '↑/↓: Navegar | Enter: Descargar grupo (pull-group) | Esc: Volver al menú'
            : '↑/↓: Navegar | Tab: Marcar | Enter: Descargar (pull) | Esc: Volver al menú'}
        </Text>
        {!isMenuMode && (
          <Text color="gray">
            {positionText}
          </Text>
        )}
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
