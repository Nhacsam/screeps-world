import fs from "fs";

import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  host: string;
  port?: number;
  secure?: boolean; // Use HTTPS or HTTP
  ptr?: boolean; // Public Test Realm
  token?: string; // Auth token for remote servers
  username?: string; // Private servers use username/password
  password?: string;
}
export interface ScreepsConfig {
  servers: Record<string, ServerConfig>;
  defaultServer: string;
  branch: string;
}

// Expand environment variables in the form ${VAR_NAME} or ${VAR_NAME:-default}
function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const [name, defaultValue] = varName.split(":-");
    return process.env[name] || defaultValue || match;
  });
}

export function loadConfig(configPath = ".screeps.json"): ScreepsConfig {
  const configFile = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configFile) as ScreepsConfig;

  // Expand environment variables
  for (const server of Object.values(config.servers)) {
    if (server.token) {
      server.token = expandEnvVars(server.token);
    }
    // Add these lines:
    if (server.username) {
      server.username = expandEnvVars(server.username);
    }
    if (server.password) {
      server.password = expandEnvVars(server.password);
    }
  }

  return config;
}
