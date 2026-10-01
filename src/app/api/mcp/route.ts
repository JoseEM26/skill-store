import { NextRequest, NextResponse } from 'next/server';
import {
  extractBearerToken,
  handleListSkills,
  handleSearchSkills,
  handleGetSkill,
  handleGetVersion,
  handleCheckUpdates,
  handleListContexts,
  handleGetContext,
  handleGetMySetup,
  handleCreateContext,
  handleUpdateContext,
  handleDeleteContext,
  handlePublishSkill,
  handleDeleteSkill,
} from '@/lib/mcp/tools';

export const dynamic = 'force-dynamic';

const AVAILABLE_TOOLS = [
  {
    name: 'list_skills',
    description: 'Lista skills públicas disponibles en el registro con sus metadatos y última versión.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Cantidad máxima de resultados (default 50)' },
        query: { type: 'string', description: 'Filtro opcional de texto' },
      },
    },
  },
  {
    name: 'search_skills',
    description: 'Busca skills en el registro por término libre sobre nombre, slug y descripción.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Término de búsqueda requerido' },
        limit: { type: 'number', description: 'Cantidad máxima de resultados (default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    description: 'Obtiene el detalle completo de una skill por owner y slug, incluyendo su historial de versiones.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Nombre de usuario del propietario' },
        slug: { type: 'string', description: 'Identificador slug de la skill' },
      },
      required: ['owner', 'slug'],
    },
  },
  {
    name: 'get_version',
    description: 'Obtiene el detalle de una versión específica de una skill (changelog, gitTag).',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Nombre de usuario del propietario' },
        slug: { type: 'string', description: 'Identificador slug de la skill' },
        version: { type: 'string', description: 'Versión SemVer exacta (ej: 1.0.0)' },
      },
      required: ['owner', 'slug', 'version'],
    },
  },
  {
    name: 'check_updates',
    description: 'Comprueba si existe una versión más reciente para una skill instalada.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Nombre de usuario del propietario' },
        slug: { type: 'string', description: 'Identificador slug de la skill' },
        currentVersion: { type: 'string', description: 'Versión actualmente instalada' },
      },
      required: ['owner', 'slug', 'currentVersion'],
    },
  },
  {
    name: 'list_contexts',
    description: 'Lista referencias públicas y, si se autentica con token, ideas privadas del usuario.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token de acceso personal opcional' },
        type: { type: 'string', enum: ['all', 'idea', 'external_reference'], description: 'Filtro por tipo' },
      },
    },
  },
  {
    name: 'get_context',
    description: 'Obtiene el detalle de un contexto por ID. Ideas privadas requieren token del dueño.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID del contexto' },
        token: { type: 'string', description: 'Token de acceso personal opcional' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_my_setup',
    description: 'Obtiene todas las skills y contextos del usuario autenticado en una sola llamada para inicializar sesiones de Claude Code.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token de acceso personal requerido' },
      },
    },
  },
  {
    name: 'create_context',
    description: 'Crea un nuevo contexto (idea privada por defecto o referencia externa pública obligatoria). Requiere scope write.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['idea', 'external_reference'], description: 'Tipo de contexto' },
        title: { type: 'string', description: 'Título del contexto (máx 150 caracteres)' },
        body: { type: 'string', description: 'Cuerpo o contenido opcional' },
        link: { type: 'string', description: 'URL requerida para external_reference' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Lista de tags' },
        isPublic: { type: 'boolean', description: 'Visibilidad (default false para idea, forzado true para external_reference)' },
        token: { type: 'string', description: 'Token de acceso personal opcional si se envía Bearer header' },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'update_context',
    description: 'Actualiza un contexto perteneciente al usuario autenticado. Requiere scope write.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID del contexto a modificar' },
        title: { type: 'string', description: 'Nuevo título opcional' },
        body: { type: 'string', description: 'Nuevo contenido opcional' },
        link: { type: 'string', description: 'Nuevo link opcional' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Nuevos tags' },
        isPublic: { type: 'boolean', description: 'Nueva visibilidad opcional' },
        token: { type: 'string', description: 'Token de acceso personal opcional si se envía Bearer header' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_context',
    description: 'Elimina un contexto perteneciente al usuario autenticado. Requiere estrictamente scope delete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID del contexto a eliminar' },
        token: { type: 'string', description: 'Token de acceso personal opcional si se envía Bearer header' },
      },
      required: ['id'],
    },
  },
  {
    name: 'publish_skill',
    description: 'Publica o actualiza una skill perteneciente al usuario autenticado. Requiere scope write.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la skill para actualizar una existente' },
        slug: { type: 'string', description: 'Identificador slug único de la skill' },
        name: { type: 'string', description: 'Nombre legible de la skill' },
        description: { type: 'string', description: 'Descripción opcional' },
        license: { type: 'string', description: 'Licencia (ej: MIT)' },
        repositoryUrl: { type: 'string', description: 'URL del repositorio de código' },
        token: { type: 'string', description: 'Token de acceso personal opcional si se envía Bearer header' },
      },
      required: ['slug', 'name'],
    },
  },
  {
    name: 'delete_skill',
    description: 'Elimina una skill perteneciente al usuario autenticado. Requiere estrictamente scope delete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la skill a eliminar' },
        slug: { type: 'string', description: 'Slug de la skill a eliminar' },
        token: { type: 'string', description: 'Token de acceso personal opcional si se envía Bearer header' },
      },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: 'cloudcode-skills-registry',
    version: '0.1.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    tools: AVAILABLE_TOOLS,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const bearerToken = extractBearerToken(authHeader);

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: JSON inválido' },
      },
      { status: 400 }
    );
  }

  const { id, method, params } = (body as { id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } }) || {};

  if (!method) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32600, message: 'Invalid Request: el campo method es requerido' },
      },
      { status: 400 }
    );
  }

  // --- MCP JSON-RPC DISPATCHER ---

  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'cloudcode-skills-registry',
          version: '0.1.0',
        },
      },
    });
  }

  if (method === 'ping') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {},
    });
  }

  if (method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: AVAILABLE_TOOLS,
      },
    });
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      let data: unknown;

      switch (toolName) {
        case 'list_skills':
          data = await handleListSkills(toolArgs);
          break;
        case 'search_skills':
          data = await handleSearchSkills(toolArgs as { query: string; limit?: number });
          break;
        case 'get_skill':
          data = await handleGetSkill(toolArgs as { owner: string; slug: string });
          break;
        case 'get_version':
          data = await handleGetVersion(toolArgs as { owner: string; slug: string; version: string });
          break;
        case 'check_updates':
          data = await handleCheckUpdates(toolArgs as { owner: string; slug: string; currentVersion: string });
          break;
        case 'list_contexts':
          data = await handleListContexts(toolArgs as { token?: string; type?: 'all' | 'idea' | 'external_reference' }, bearerToken);
          break;
        case 'get_context':
          data = await handleGetContext(toolArgs as { id: string; token?: string }, bearerToken);
          break;
        case 'get_my_setup':
          data = await handleGetMySetup(toolArgs as { token?: string }, bearerToken);
          break;
        case 'create_context':
          data = await handleCreateContext(
            toolArgs as Parameters<typeof handleCreateContext>[0],
            bearerToken
          );
          break;
        case 'update_context':
          data = await handleUpdateContext(
            toolArgs as Parameters<typeof handleUpdateContext>[0],
            bearerToken
          );
          break;
        case 'delete_context':
          data = await handleDeleteContext(
            toolArgs as Parameters<typeof handleDeleteContext>[0],
            bearerToken
          );
          break;
        case 'publish_skill':
          data = await handlePublishSkill(
            toolArgs as Parameters<typeof handlePublishSkill>[0],
            bearerToken
          );
          break;
        case 'delete_skill':
          data = await handleDeleteSkill(
            toolArgs as Parameters<typeof handleDeleteSkill>[0],
            bearerToken
          );
          break;
        default:
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Tool '${toolName}' no encontrada`,
              },
            },
            { status: 404 }
          );
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error ejecutando tool '${toolName}': ${errorMessage}`,
            },
          ],
        },
      });
    }
  }

  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' no soportado` },
    },
    { status: 404 }
  );
}
