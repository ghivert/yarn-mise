function selectToml(fs, resolve) {
  if (fs.existsSync(resolve(".mise.toml"))) return resolve(".mise.toml");
  if (fs.existsSync(resolve(".mise.local.toml")))
    return resolve(".mise.local.toml");
}

function parse(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

module.exports = {
  name: `plugin-hello-world`,
  factory: (require) => {
    const path = require("path");
    const fs = require("fs");
    return {
      hooks: {
        /** @param project Project */
        setupScriptEnvironment(project, scriptEnv) {
          const workspaceCwd = path.dirname(scriptEnv.npm_package_json);
          const workspace = project.tryWorkspaceByCwd(workspaceCwd);
          if (!workspace) return;
          const paths = workspace.relativeCwd.split("/").reduce((acc, val) => {
            const prev = acc.at(-1);
            const value = prev ? [prev, val].join("/") : val;
            return [...acc, value];
          }, []);
          for (const part of paths) {
            const tomlDir = path.resolve(project.cwd, part);
            const filePath = selectToml(fs, (c) => path.resolve(tomlDir, c));
            if (!filePath) continue;
            const content = fs.readFileSync(filePath, "utf-8");
            content.split("\n").reduce((isEnv, val) => {
              if (val === "[env]") return true;
              if (val.startsWith("[")) return false;
              if (isEnv) {
                const match = val.match(/^([_a-zA-Z0-9]+)\s?=\s?(.*)/);
                if (!match) return true;
                const [_, variable, value] = match;
                const parsed = parse(value);
                if (!parsed) return true;
                scriptEnv[variable.toUpperCase()] = parsed;
                return true;
              }
              return false;
            }, false);
          }
        },
      },
    };
  },
};
