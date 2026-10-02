import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { readStoredToken, saveStoredToken } from './config';
import { callMcpTool, MySetupData, SkillDetail, SkillSummary } from './client';

export interface CommandResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Handles `login --token <PAT>`
 */
export async function handleLogin(options: {
  token?: string;
  configPath?: string;
}): Promise<CommandResult<{ configPath: string }>> {
  const token = options.token?.trim();
  if (!token) {
    return {
      success: false,
      message: 'Token no especificado. Uso: skills login --token <PAT>',
      error: 'Token no especificado',
    };
  }

  try {
    const savedPath = saveStoredToken(token, options.configPath);
    return {
      success: true,
      message: `✅ Sesión iniciada correctamente. Token guardado en ${savedPath}`,
      data: { configPath: savedPath },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return {
      success: false,
      message: `Error al guardar configuración: ${msg}`,
      error: msg,
    };
  }
}

/**
 * Handles `whoami`
 */
export async function handleWhoami(options?: {
  configPath?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<CommandResult<MySetupData>> {
  const token = readStoredToken(options?.configPath);
  if (!token) {
    return {
      success: false,
      message: 'No hay sesión activa. Usa `login --token <PAT>` para iniciar sesión.',
      error: 'Sin sesión activa',
    };
  }

  const result = await callMcpTool<MySetupData>(
    'get_my_setup',
    {},
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: 'El token guardado ya no es válido o ha sido revocado. Por favor vuelve a iniciar sesión con `login --token <PAT>`.',
      error: result.error || 'Token inválido',
    };
  }

  const data = result.data;
  const username = data.user.username;
  const userId = data.user.id;
  const skillsCount = data.skills?.length || 0;
  const ideasCount = data.contexts?.ideas?.length || 0;
  const refCount = data.contexts?.externalReferences?.length || 0;

  const msg = [
    `👤 Sesión activa como: @${username} (ID: ${userId})`,
    `📦 Skills propias registradas: ${skillsCount}`,
    `💡 Contextos: ${ideasCount} idea(s), ${refCount} referencia(s) externa(s)`,
  ].join('\n');

  return {
    success: true,
    message: msg,
    data,
  };
}

/**
 * Handles `list` and `search <query>`
 */
export async function handleListOrSearch(options?: {
  query?: string;
  limit?: number;
  configPath?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<CommandResult<SkillSummary[]>> {
  const token = readStoredToken(options?.configPath);
  const isSearch = Boolean(options?.query && options.query.trim().length > 0);
  const toolName = isSearch ? 'search_skills' : 'list_skills';
  const toolArgs: Record<string, unknown> = {};

  if (options?.limit) toolArgs.limit = options.limit;
  if (isSearch) toolArgs.query = options!.query!.trim();

  const result = await callMcpTool<SkillSummary[]>(
    toolName,
    toolArgs,
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: `Error al consultar skills: ${result.error || 'Error desconocido'}`,
      error: result.error || 'Error desconocido',
    };
  }

  const skills = result.data;
  if (!Array.isArray(skills) || skills.length === 0) {
    const msg = isSearch
      ? `No se encontraron skills para "${options?.query}".`
      : 'No se encontraron skills disponibles en el registro.';
    return {
      success: true,
      message: msg,
      data: [],
    };
  }

  const formattedLines: string[] = [];
  formattedLines.push(isSearch ? `🔍 Resultados para "${options?.query}":` : '📦 Skills disponibles:');
  formattedLines.push('');

  skills.forEach((skill, index) => {
    const num = `[${index + 1}]`;
    const ver = skill.latestVersion?.version ? `v${skill.latestVersion.version}` : 'sin versión';
    const flags: string[] = [];
    if (!skill.isPublic) flags.push('[Privada]');
    if (skill.isPaused) flags.push('[Pausada]');
    const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';

    formattedLines.push(`${num} ${skill.owner}/${skill.slug} (${ver}) - ${skill.name}${flagStr}`);
    if (skill.description) {
      formattedLines.push(`    ${skill.description}`);
    }
  });

  return {
    success: true,
    message: formattedLines.join('\n'),
    data: skills,
  };
}

/**
 * Handles `pull <owner>/<slug> [--dir <ruta>]`
 */
export async function handlePull(
  skillIdentifier: string,
  options?: {
    dir?: string;
    configPath?: string;
    baseUrl?: string;
    targetBaseDir?: string;
    fetchFn?: typeof fetch;
  }
): Promise<CommandResult<{ targetDir: string; filesWritten: string[] }>> {
  if (!skillIdentifier || !skillIdentifier.includes('/')) {
    return {
      success: false,
      message: 'Formato inválido. Debe especificar <owner>/<slug> (ej: Aybar-Corp/mi-skill)',
      error: 'Formato inválido',
    };
  }

  const [rawOwner, ...slugParts] = skillIdentifier.trim().split('/');
  const owner = rawOwner.trim();
  const slug = slugParts.join('/').trim();

  if (!owner || !slug) {
    return {
      success: false,
      message: 'Formato inválido. Debe especificar <owner>/<slug>',
      error: 'Formato inválido',
    };
  }

  const token = readStoredToken(options?.configPath);
  const result = await callMcpTool<SkillDetail>(
    'get_skill',
    { owner, slug },
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: `Error: La skill '${owner}/${slug}' no existe o no está disponible.`,
      error: result.error || 'Skill no encontrada o no disponible',
    };
  }

  const skill = result.data;
  const latestVersion = skill.latestVersion;
  const versionStr = latestVersion?.version ? `v${latestVersion.version}` : '';
  const files = latestVersion?.files;

  const defaultDir = path.join('.claude', 'skills', slug);
  const targetRelDir = options?.dir || defaultDir;
  const baseDir = options?.targetBaseDir || process.cwd();
  const destDir = path.resolve(baseDir, targetRelDir);

  if (!files || Object.keys(files).length === 0) {
    return {
      success: true,
      message: `⚠️ La skill '${owner}/${slug}' ${versionStr} no contiene archivos registrados en el registro.`,
      data: { targetDir: destDir, filesWritten: [] },
    };
  }

  const filesWritten: string[] = [];
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const filePath = path.join(destDir, relPath);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
      filesWritten.push(relPath);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de escritura en disco';
    return {
      success: false,
      message: `Error al escribir archivos en disco: ${msg}`,
      error: msg,
    };
  }

  const msgLines = [
    `✅ Skill '${owner}/${slug}' ${versionStr} descargada con éxito en: ${destDir}`,
    'Archivos creados:',
    ...filesWritten.map((f) => `  - ${f}`),
  ];

  return {
    success: true,
    message: msgLines.join('\n'),
    data: { targetDir: destDir, filesWritten },
  };
}

/**
 * Interactive list/search helper with readline
 */
export async function promptInteractiveSelection(
  skills: SkillSummary[],
  options?: {
    configPath?: string;
    baseUrl?: string;
    targetBaseDir?: string;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
  }
): Promise<void> {
  if (!skills || skills.length === 0) return;

  const rl = readline.createInterface({
    input: options?.input || process.stdin,
    output: options?.output || process.stdout,
  });

  try {
    const answer = await rl.question(
      '\nElige el número de una skill para descargar (o presiona Enter para salir): '
    );
    const num = parseInt(answer.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= skills.length) {
      const selected = skills[num - 1];
      console.log(`\nDescargando ${selected.owner}/${selected.slug}...`);
      const pullResult = await handlePull(`${selected.owner}/${selected.slug}`, {
        configPath: options?.configPath,
        baseUrl: options?.baseUrl,
        targetBaseDir: options?.targetBaseDir,
      });
      console.log(pullResult.message);
    }
  } finally {
    rl.close();
  }
}
