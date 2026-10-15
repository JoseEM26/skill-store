import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import http from 'node:http';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { clearStoredToken, readStoredToken, saveStoredToken } from './config';
import { callMcpTool, getRegistryUrl, GroupDetail, MySetupData, SkillDetail, SkillSummary } from './client';

export interface CommandResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export function openDefaultBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cmd: string;
    if (process.platform === 'darwin') {
      cmd = `open "${url}"`;
    } else if (process.platform === 'win32') {
      cmd = `cmd /c start "" "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export interface BrowserLoginOptions {
  baseUrl?: string;
  configPath?: string;
  timeoutMs?: number;
  openBrowserFn?: (url: string) => Promise<boolean>;
}

/**
 * Handles automatic login via local HTTP server and browser
 */
export async function handleBrowserLogin(
  options?: BrowserLoginOptions
): Promise<CommandResult<{ configPath: string }>> {
  const baseUrl = getRegistryUrl(options?.baseUrl);
  const state = crypto.randomBytes(16).toString('hex');
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const openFn = options?.openBrowserFn ?? openDefaultBrowser;

  return new Promise<CommandResult<{ configPath: string }>>((resolve) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isFinished = false;

    const server = http.createServer((req, res) => {
      // CORS headers to allow browser fetch from admin panel
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const reqUrl = req.url?.split('?')[0];
      if (req.method !== 'POST' || reqUrl !== '/callback') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }

      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk;
      });

      req.on('end', () => {
        try {
          const body = JSON.parse(rawBody);
          if (
            !body ||
            body.state !== state ||
            !body.token ||
            typeof body.token !== 'string'
          ) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid_state' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));

          const savedPath = saveStoredToken(body.token, options?.configPath);
          finish({
            success: true,
            message: `✅ Sesión iniciada correctamente. Token guardado en ${savedPath}`,
            data: { configPath: savedPath },
          });
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_body' }));
        }
      });
    });

    function finish(result: CommandResult<{ configPath: string }>) {
      if (isFinished) return;
      isFinished = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      try {
        server.close();
        if (typeof (server as unknown as { closeAllConnections?: () => void }).closeAllConnections === 'function') {
          (server as unknown as { closeAllConnections: () => void }).closeAllConnections();
        }
      } catch {}
      resolve(result);
    }

    server.on('error', (err) => {
      finish({
        success: false,
        message: `Error en el servidor local de autenticación: ${err.message}`,
        error: err.message,
      });
    });

    timeoutId = setTimeout(() => {
      finish({
        success: false,
        message: `Tiempo de espera agotado (3 min). No se recibió la autenticación desde el navegador.\nPodés iniciar sesión manualmente con:\n  cloudcode login --token <PAT>\nGenerá un token en ${baseUrl}/admin/tokens si no tenés uno.`,
        error: 'timeout',
      });
    }, timeoutMs);

    server.listen(0, async () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        finish({
          success: false,
          message: 'No se pudo obtener el puerto del servidor local.',
          error: 'port_error',
        });
        return;
      }

      const realPort = address.port;
      const authUrl = `${baseUrl}/admin/cli-auth?port=${realPort}&state=${state}`;

      console.log(`Abriendo navegador para iniciar sesión en:\n  ${authUrl}\n`);

      const opened = await openFn(authUrl);
      if (!opened) {
        console.log(
          `⚠️ No se pudo abrir el navegador automáticamente.\nPor favor abrí el siguiente enlace manualmente en tu navegador:\n  ${authUrl}\nO iniciá sesión con: cloudcode login --token <PAT>\n`
        );
      }
    });
  });
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
 * Handles `logout`
 */
export async function handleLogout(options?: {
  configPath?: string;
}): Promise<CommandResult> {
  try {
    const cleared = clearStoredToken(options?.configPath);
    if (cleared) {
      return {
        success: true,
        message: 'Sesión cerrada correctamente.',
      };
    }
    return {
      success: true,
      message: 'No había ninguna sesión activa.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return {
      success: false,
      message: `Error al cerrar sesión: ${msg}`,
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
    token?: string | null;
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

  const token = options?.token || readStoredToken(options?.configPath);
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

export interface PullGroupResultData {
  groupName: string;
  totalSkills: number;
  pulledSkills: string[];
  failedSkills: string[];
}

/**
 * Handles `pull-group <groupName>`
 */
export async function handlePullGroup(
  groupName: string,
  options?: {
    dir?: string;
    configPath?: string;
    baseUrl?: string;
    targetBaseDir?: string;
    fetchFn?: typeof fetch;
    token?: string | null;
  }
): Promise<CommandResult<PullGroupResultData>> {
  if (!groupName || !groupName.trim()) {
    return {
      success: false,
      message: 'Error: Debe especificar el nombre del grupo. Ej: skills pull-group mi-stack',
      error: 'Nombre de grupo no especificado',
    };
  }

  const cleanGroupName = groupName.trim();
  const token = options?.token || readStoredToken(options?.configPath);

  const result = await callMcpTool<GroupDetail>(
    'get_group',
    { name: cleanGroupName },
    {
      token,
      baseUrl: options?.baseUrl,
      fetchFn: options?.fetchFn,
    }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      message: `Error: El grupo '${cleanGroupName}' no existe o no está disponible.`,
      error: result.error || 'Grupo no encontrado o no disponible',
    };
  }

  const group = result.data;
  const skills = group.skills || [];

  if (skills.length === 0) {
    return {
      success: true,
      message: `⚠️ El grupo '${cleanGroupName}' no contiene skills disponibles.`,
      data: {
        groupName: cleanGroupName,
        totalSkills: 0,
        pulledSkills: [],
        failedSkills: [],
      },
    };
  }

  const pulledSkills: string[] = [];
  const failedSkills: string[] = [];
  const outputLines: string[] = [
    `📦 Descargando grupo '${cleanGroupName}' (${skills.length} skills)...`,
    '',
  ];

  for (const skill of skills) {
    const identifier = `${skill.owner}/${skill.slug}`;
    try {
      const pullRes = await handlePull(identifier, {
        dir: options?.dir,
        configPath: options?.configPath,
        baseUrl: options?.baseUrl,
        targetBaseDir: options?.targetBaseDir,
        fetchFn: options?.fetchFn,
        token,
      });

      if (pullRes.success) {
        pulledSkills.push(identifier);
        outputLines.push(`  ✅ ${identifier}: descargada`);
      } else {
        failedSkills.push(identifier);
        outputLines.push(`  ❌ ${identifier}: ${pullRes.error || pullRes.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      failedSkills.push(identifier);
      outputLines.push(`  ❌ ${identifier}: ${msg}`);
    }
  }

  outputLines.push('');
  outputLines.push(
    `Resumen: ${pulledSkills.length}/${skills.length} skills descargadas con éxito.`
  );

  return {
    success: failedSkills.length === 0,
    message: outputLines.join('\n'),
    data: {
      groupName: cleanGroupName,
      totalSkills: skills.length,
      pulledSkills,
      failedSkills,
    },
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
