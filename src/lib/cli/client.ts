export interface McpCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SkillSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  license: string | null;
  repositoryUrl: string | null;
  isPublic: boolean;
  isPaused: boolean;
  owner: string;
  downloadsCount: number;
  installsCount: number;
  installCommand: string;
  latestVersion: {
    version: string;
    publishedAt: string;
    changelog: string | null;
    gitTag: string | null;
  } | null;
}

export interface SkillDetail extends SkillSummary {
  isArchived: boolean;
  latestVersion: {
    version: string;
    publishedAt: string;
    changelog: string | null;
    gitTag: string | null;
    files: Record<string, string> | null;
  } | null;
  versions: Array<{
    version: string;
    publishedAt: string;
    changelog: string | null;
    gitTag: string | null;
    files: Record<string, string> | null;
  }>;
}

export interface MySetupData {
  user: {
    id: string;
    username: string;
    githubId: string;
    avatarUrl: string | null;
  };
  skills: SkillSummary[];
  contexts: {
    ideas: Array<{
      id: string;
      title: string;
      body: string | null;
      tags: string[];
      isPublic: boolean;
      createdAt: string;
    }>;
    externalReferences: Array<{
      id: string;
      title: string;
      body: string | null;
      link: string;
      tags: string[];
      isPublic: boolean;
      createdAt: string;
    }>;
  };
}

export function getRegistryUrl(overrideUrl?: string): string {
  const base = overrideUrl || process.env.REGISTRY_URL || 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

export async function callMcpTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {},
  options?: { token?: string | null; baseUrl?: string; fetchFn?: typeof fetch }
): Promise<McpCallResult<T>> {
  const baseUrl = getRegistryUrl(options?.baseUrl);
  const endpoint = `${baseUrl}/api/mcp`;
  const fetchImpl = options?.fetchFn || fetch;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        } else if (errorJson.error) {
          errorMsg = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        }
      } catch {
        // use default errorMsg
      }
      return { success: false, error: errorMsg };
    }

    const json = (await res.json()) as {
      jsonrpc?: string;
      error?: { code?: number; message?: string };
      result?: {
        isError?: boolean;
        content?: Array<{ type: string; text: string }>;
      };
    };

    if (json.error) {
      return { success: false, error: json.error.message || 'Error en respuesta JSON-RPC' };
    }

    if (json.result?.isError) {
      const errorContent = json.result.content?.[0]?.text || 'Error ejecutando tool';
      // Clean up "Error ejecutando tool 'xxx': " prefix if present for cleaner UI message
      const cleanMessage = errorContent.replace(/^Error ejecutando tool '[^']+':\s*/i, '');
      return { success: false, error: cleanMessage };
    }

    const text = json.result?.content?.[0]?.text;
    if (text !== undefined) {
      try {
        const parsed = JSON.parse(text) as T;
        return { success: true, data: parsed };
      } catch {
        return { success: true, data: text as unknown as T };
      }
    }

    return { success: true, data: json.result as unknown as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido de conexión';
    return {
      success: false,
      error: `No se pudo conectar con el servidor MCP en ${endpoint}: ${message}`,
    };
  }
}
