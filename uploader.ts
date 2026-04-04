import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { loadConfig, type ServerConfig } from "./config.ts";

const DIST_DIR = "dist";

export async function uploadToServer(
  serverName: string,
  branch?: string
): Promise<void> {
  const config = loadConfig();
  const server = config.servers[serverName];

  if (!server) {
    throw new Error(`Server '${serverName}' not found in screeps.json`);
  }

  const targetBranch = branch || config.branch;
  const modules = await loadModules();

  await uploadToAPI(server, modules, targetBranch);
}

async function loadModules(): Promise<Record<string, string>> {
  const files = fs.readdirSync(DIST_DIR);
  const modules: Record<string, string> = {};

  for (const f of files) {
    if (f.endsWith(".js")) {
      const name = path.basename(f, ".js");
      const code = fs.readFileSync(path.join(DIST_DIR, f), "utf8");
      modules[name] = code;
    }
  }

  return modules;
}

async function uploadToAPI(
  server: ServerConfig,
  modules: Record<string, string>,
  branch: string
): Promise<void> {
  const protocol = server.secure ? "https" : "http";
  const port = server.port ? `:${server.port}` : "";
  const url = `${protocol}://${server.host}${port}/api/user/code`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Handle local server auth
  if (server.host === "localhost" || server.host === "127.0.0.1") {
    if (!server.username || !server.password) {
      throw new Error("Local server requires username and password");
    }
    // Use basic auth for local server
    const auth = Buffer.from(`${server.username}:${server.password}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${auth}`;
  } else {
    // Use token for remote servers
    if (!server.token) {
      throw new Error("Remote server requires token");
    }
    headers["X-Token"] = server.token;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ branch, modules }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  if (result.ok) {
    console.log(
      `🚀 Uploaded ${Object.keys(modules).length} modules to ${server.host}`
    );
  } else {
    throw new Error(`Upload failed: ${JSON.stringify(result)}`);
  }
}
