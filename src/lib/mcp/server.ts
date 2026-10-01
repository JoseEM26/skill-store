import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  handleListSkills,
  listSkillsInputSchema,
  handleSearchSkills,
  searchSkillsInputSchema,
  handleGetSkill,
  getSkillInputSchema,
  handleGetVersion,
  getVersionInputSchema,
  handleCheckUpdates,
  checkUpdatesInputSchema,
  handleListContexts,
  listContextsInputSchema,
  handleGetContext,
  getContextInputSchema,
  handleGetMySetup,
  getMySetupInputSchema,
  handleCreateContext,
  handleUpdateContext,
  updateContextMcpSchema,
  handleDeleteContext,
  deleteContextMcpSchema,
  handlePublishSkill,
  publishSkillMcpSchema,
  handleDeleteSkill,
  handleInstallSkill,
  installSkillInputSchema,
} from './tools';
import { createContextMcpBaseSchema, deleteSkillMcpBaseSchema } from '@/lib/validations/mcp';

export function createMcpServer(bearerToken?: string | null) {
  const server = new McpServer({
    name: 'cloudcode-skills-registry',
    version: '0.1.0',
  });

  // 1. list_skills
  server.tool(
    'list_skills',
    'Lista skills públicas disponibles en el registro con sus metadatos y última versión.',
    listSkillsInputSchema.shape,
    async (args) => {
      const result = await handleListSkills(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 2. search_skills
  server.tool(
    'search_skills',
    'Busca skills en el registro por término libre sobre nombre, slug y descripción.',
    searchSkillsInputSchema.shape,
    async (args) => {
      const result = await handleSearchSkills(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 3. get_skill
  server.tool(
    'get_skill',
    'Obtiene el detalle completo de una skill por owner y slug, incluyendo su historial de versiones.',
    getSkillInputSchema.shape,
    async (args) => {
      const result = await handleGetSkill(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 4. get_version
  server.tool(
    'get_version',
    'Obtiene el detalle de una versión específica de una skill (changelog, gitTag).',
    getVersionInputSchema.shape,
    async (args) => {
      const result = await handleGetVersion(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 5. check_updates
  server.tool(
    'check_updates',
    'Comprueba si existe una versión más reciente para una skill instalada.',
    checkUpdatesInputSchema.shape,
    async (args) => {
      const result = await handleCheckUpdates(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 6. list_contexts
  server.tool(
    'list_contexts',
    'Lista referencias públicas y, si se autentica con token, ideas privadas del usuario.',
    listContextsInputSchema.shape,
    async (args) => {
      const result = await handleListContexts(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 7. get_context
  server.tool(
    'get_context',
    'Obtiene el detalle de un contexto por ID. Ideas privadas requieren token del dueño.',
    getContextInputSchema.shape,
    async (args) => {
      const result = await handleGetContext(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 8. get_my_setup
  server.tool(
    'get_my_setup',
    'Obtiene todas las skills y contextos del usuario autenticado en una sola llamada para inicializar sesiones de Claude Code.',
    getMySetupInputSchema.shape,
    async (args) => {
      const result = await handleGetMySetup(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 9. create_context
  server.tool(
    'create_context',
    'Crea un nuevo contexto (idea privada por defecto o referencia externa pública obligatoria). Requiere scope write.',
    createContextMcpBaseSchema.shape,
    async (args) => {
      const result = await handleCreateContext(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 10. update_context
  server.tool(
    'update_context',
    'Actualiza un contexto perteneciente al usuario autenticado. Requiere scope write.',
    updateContextMcpSchema.shape,
    async (args) => {
      const result = await handleUpdateContext(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 11. delete_context
  server.tool(
    'delete_context',
    'Elimina un contexto perteneciente al usuario autenticado. Requiere estrictamente scope delete.',
    deleteContextMcpSchema.shape,
    async (args) => {
      const result = await handleDeleteContext(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 12. publish_skill
  server.tool(
    'publish_skill',
    'Publica o actualiza una skill perteneciente al usuario autenticado. Requiere scope write.',
    publishSkillMcpSchema.shape,
    async (args) => {
      const result = await handlePublishSkill(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 13. delete_skill
  server.tool(
    'delete_skill',
    'Elimina una skill perteneciente al usuario autenticado. Requiere estrictamente scope delete.',
    deleteSkillMcpBaseSchema.shape,
    async (args) => {
      const result = await handleDeleteSkill(args, bearerToken);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 14. install_skill
  server.tool(
    'install_skill',
    'Registra la instalación de una skill incrementando su contador de popularidad de forma pública (ADR-0009) y devuelve los metadatos y comando de instalación.',
    installSkillInputSchema.shape,
    async (args) => {
      const result = await handleInstallSkill(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
