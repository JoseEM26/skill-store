import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CliConfig {
  token?: string;
  registryUrl?: string;
}

export function getConfigPath(): string {
  if (process.env.SKILLS_CONFIG_PATH) {
    return path.resolve(process.env.SKILLS_CONFIG_PATH);
  }
  return path.join(os.homedir(), '.config', 'cloudcode-skills', 'config.json');
}

export function readConfig(customPath?: string): CliConfig | null {
  const filePath = customPath || getConfigPath();
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as CliConfig;
  } catch {
    return null;
  }
}

export function readStoredToken(customPath?: string): string | null {
  const config = readConfig(customPath);
  return config?.token || null;
}

export function saveStoredToken(token: string, customPath?: string): string {
  const filePath = customPath || getConfigPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const currentConfig = readConfig(filePath) || {};
  const newConfig: CliConfig = {
    ...currentConfig,
    token,
  };
  fs.writeFileSync(filePath, JSON.stringify(newConfig, null, 2), 'utf8');
  return filePath;
}

export function clearStoredToken(customPath?: string): boolean {
  const filePath = customPath || getConfigPath();
  const currentConfig = readConfig(filePath);
  if (!currentConfig || !currentConfig.token) {
    return false;
  }
  const remainingConfig = { ...currentConfig };
  delete remainingConfig.token;
  fs.writeFileSync(filePath, JSON.stringify(remainingConfig, null, 2), 'utf8');
  return true;
}
