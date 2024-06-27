import { existsSync, readFileSync } from "node:fs";
import { env } from "node:process";
import { ConfigObject, CustomConfigObject } from "./index.js";
import { normalizePath } from "./selectSource.js";

let custom_config: Partial<CustomConfigObject> = {};
let config_path =
  env?.npm_package_json?.replace(/package\.json$/, ".imagebinrc") ?? "";
let loaded_config, parsed_config;
if (config_path && (config_path = normalizePath(config_path))) {
  // Try .imagebinrc - JSON
  if (
    existsSync(config_path) &&
    (loaded_config = readFileSync(config_path, {
      encoding: "utf8",
      flag: "r",
    })) &&
    (parsed_config = JSON.parse(loaded_config))
  ) {
    custom_config = parsed_config;
  } else if ((config_path = `${config_path}.js`) && existsSync(config_path)) {
    // Try .imagebinrc.js - JS object (exported as default)
    const { default: _default } = await import(`file://${config_path}`);
    if (_default) {
      custom_config = _default;
    }
  }
}

export const loadConfig = (package_config: ConfigObject): ConfigObject => {
  return {
    ...package_config,
    bin_version:
      custom_config?.bin_version ?? package_config?.bin_version ?? "",
    max_redirects:
      custom_config?.max_redirects ?? package_config?.max_redirects ?? 0,
    prebuilt_unpack_files_filter:
      typeof custom_config?.prebuilt_unpack_files_filter === "function"
        ? custom_config.prebuilt_unpack_files_filter
        : package_config?.prebuilt_unpack_files_filter,
    destinations: [
      ...(custom_config?.destinations ?? []),
      ...(package_config?.destinations ?? []),
    ],
    prebuilts: [
      ...(custom_config?.prebuilts ?? []),
      ...(package_config?.prebuilts ?? []),
    ],
    builds: [
      ...(custom_config?.builds ?? []),
      ...(package_config?.builds ?? []),
    ],
  };
};
