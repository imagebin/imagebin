import { resolve } from "node:path";
import {
  ConfigObject,
  loadConfig,
  normalizePath,
  getLocalBinPath,
  ensureBinaryIsInstalled,
} from "@imagebin/core";
import packageJSON from "./package.json" with { type: "json" };

const baseUrl = `https://downloads.sourceforge.net/project/optipng/OptiPNG/optipng-${packageJSON.bin_version}/optipng-${packageJSON.bin_version}`;
// const external_source = `${baseUrl}.tar.gz`;

export const config: ConfigObject = loadConfig({
  name: packageJSON.name,
  version: packageJSON.version,
  bin_version: packageJSON.bin_version,
  root: normalizePath(resolve(__dirname, "../bin")),
  destinations: [
    {
      os: "linux",
      destination: "optipng",
    },
    {
      os: "macos",
      destination: "optipng",
    },
    {
      os: "windows",
      destination: "optipng.exe",
    },
  ],
  check_command_arguments: ["-v"],
  check_command_compare: (stdout: string = "") => {
    return stdout.startsWith(`OptiPNG version ${packageJSON.bin_version}`);
  },
  max_redirects: 2,
  prebuilts: [
    {
      os: "windows",
      arch: "x86",
      external_source: `${baseUrl}-win32.zip`,
    },
    {
      os: "windows",
      arch: "x64",
      external_source: `${baseUrl}-win64.zip`,
    },
  ],
});

export const getBinPath = async (throw_error = false) => {
  return await getLocalBinPath(config, throw_error, true);
};

export const installBinary = async (throw_error = true) => {
  return await ensureBinaryIsInstalled(config, throw_error);
};

export const sanitizeArguments = (args: string[] = []) => {
  // TODO: sanitize and filter

  return args;
};
