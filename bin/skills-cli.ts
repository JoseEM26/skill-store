#!/usr/bin/env tsx

import {
  handleLogin,
  handleBrowserLogin,
  handleLogout,
  handleWhoami,
  handleListOrSearch,
  handlePull,
  handlePullGroup,
  promptInteractiveSelection,
} from '../src/lib/cli/commands';

function printHelp(): void {
  console.log(`
CloudCode Skills CLI - Gestor de skills y agentes para asistentes de IA

Uso:
  cloudcode <comando> [opciones]

Comandos disponibles:
  login --token <PAT>           Guarda un Personal Access Token para autenticar comandos
  logout                        Cierra la sesión activa y borra el token guardado
  whoami                        Verifica la sesión activa e información de usuario
  list                          Lista las skills disponibles (con selector interactivo)
  search <query>                Busca skills por término libre
  tui                           Dashboard interactivo de pantalla completa para explorar y descargar skills
  pull <owner>/<slug> [--dir]   Descarga los archivos de una skill en el proyecto local
  pull-group <nombre> [--dir]   Descarga todas las skills de un grupo guardado

Opciones globales:
  --dir <ruta>                  Directorio destino para 'pull' (default: .claude/skills/<slug>/)
  --help, -h                    Muestra esta ayuda
  --version, -v                 Muestra la versión del CLI

Ejemplos:
  $ cloudcode login --token ccs_pat_123456789
  $ cloudcode logout
  $ cloudcode whoami
  $ cloudcode list
  $ cloudcode search react
  $ cloudcode tui
  $ cloudcode pull Aybar-Corp/manual-desarrollo
  $ cloudcode pull Aybar-Corp/manual-desarrollo --dir .cursor/skills/manual-desarrollo
`);
}

function parseFlags(args: string[]): {
  command?: string;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        const [key, ...valParts] = arg.slice(2).split('=');
        flags[key] = valParts.join('=');
      } else {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[key] = nextArg;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return {
    command: positional[0],
    positional: positional.slice(1),
    flags,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const { command, positional, flags } = parseFlags(argv);

  if (flags.version || flags.v || command === 'version') {
    console.log('skills-cli v0.1.0');
    return 0;
  }

  if (!command || flags.help || flags.h || command === 'help') {
    printHelp();
    return 0;
  }

  switch (command) {
    case 'login': {
      const token = (flags.token || flags.t || positional[0]) as string | undefined;
      const configPath = (flags.config || flags.c) as string | undefined;
      const baseUrl = (flags.baseUrl || flags.url) as string | undefined;

      if (token) {
        const res = await handleLogin({ token, configPath });
        console.log(res.message);
        return res.success ? 0 : 1;
      }

      const res = await handleBrowserLogin({ configPath, baseUrl });
      console.log(res.message);
      return res.success ? 0 : 1;
    }

    case 'logout': {
      const configPath = (flags.config || flags.c) as string | undefined;
      const res = await handleLogout(configPath ? { configPath } : undefined);
      console.log(res.message);
      return res.success ? 0 : 1;
    }

    case 'whoami': {
      const res = await handleWhoami();
      console.log(res.message);
      return res.success ? 0 : 1;
    }

    case 'list': {
      const res = await handleListOrSearch();
      console.log(res.message);
      if (!res.success) return 1;

      if (
        res.data &&
        res.data.length > 0 &&
        process.stdin.isTTY &&
        !flags['non-interactive']
      ) {
        await promptInteractiveSelection(res.data);
      }
      return 0;
    }

    case 'search': {
      const query = positional.join(' ') || (flags.query as string) || '';
      if (!query.trim()) {
        console.error('Error: Debe especificar un término de búsqueda. Ej: cloudcode search react');
        return 1;
      }
      const res = await handleListOrSearch({ query });
      console.log(res.message);
      if (!res.success) return 1;

      if (
        res.data &&
        res.data.length > 0 &&
        process.stdin.isTTY &&
        !flags['non-interactive']
      ) {
        await promptInteractiveSelection(res.data);
      }
      return 0;
    }

    case 'tui': {
      const { runSkillsTui } = await import('../src/lib/cli/tui');
      const dir = (flags.dir || flags.d) as string | undefined;
      await runSkillsTui({ dir });
      return 0;
    }

    case 'pull': {
      const identifier = positional[0];
      if (!identifier) {
        console.error('Error: Debe especificar la skill a descargar. Ej: cloudcode pull Aybar-Corp/manual-desarrollo');
        return 1;
      }
      const dir = (flags.dir || flags.d) as string | undefined;
      const res = await handlePull(identifier, { dir });
      console.log(res.message);
      return res.success ? 0 : 1;
    }

    case 'pull-group': {
      const groupName = positional[0];
      if (!groupName) {
        console.error('Error: Debe especificar el nombre del grupo. Ej: cloudcode pull-group mi-stack');
        return 1;
      }
      const dir = (flags.dir || flags.d) as string | undefined;
      const res = await handlePullGroup(groupName, { dir });
      console.log(res.message);
      return res.success ? 0 : 1;
    }

    default: {
      console.error(`Comando desconocido: '${command}'`);
      printHelp();
      return 1;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => {
      if (code !== 0) {
        process.exit(code);
      }
    })
    .catch((err) => {
      console.error('Error inesperado:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
