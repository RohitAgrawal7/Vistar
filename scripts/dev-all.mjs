import { spawn } from "node:child_process";

function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => {
    if (code) process.exit(code);
  });
  return child;
}

const api = run("npm", ["run", "dev", "--prefix", "backend"]);
const web = run("npm", ["run", "dev"]);

function shut() {
  api.kill("SIGINT");
  web.kill("SIGINT");
}

process.on("SIGINT", shut);
process.on("SIGTERM", shut);
