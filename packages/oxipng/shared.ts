import { resolve } from "node:path";
import {
  ConfigObject,
  loadConfig,
  normalizePath,
  getLocalBinPath,
  ensureBinaryIsInstalled,
} from "@imagebin/core";
import packageJSON from "./package.json" with { type: "json" };

const baseUrl = `https://github.com/oxipng/oxipng/releases/download/v${packageJSON.bin_version}/oxipng-${packageJSON.bin_version}-`;
// const external_source = `https://github.com/oxipng/oxipng/archive/refs/tags/v${packageJSON.bin_version}.tar.gz`;

export const config: ConfigObject = loadConfig({
  name: packageJSON.name,
  version: packageJSON.version,
  bin_version: packageJSON.bin_version,
  root: normalizePath(resolve(__dirname, "../bin")),
  destinations: [
    {
      os: "linux",
      destination: "oxipng",
    },
    {
      os: "macos",
      destination: "oxipng",
    },
    {
      os: "windows",
      destination: "oxipng.exe",
    },
  ],
  check_command_arguments: ["--version"],
  check_command_compare: (stdout: string = "") => {
    return stdout.startsWith(`oxipng ${packageJSON.bin_version}`);
  },
  max_redirects: 2,
  prebuilts: [
    {
      os: "linux",
      arch: "x64",
      musl: true,
      external_source: `${baseUrl}x86_64-unknown-linux-musl.tar.gz`,
    },
    {
      os: "linux",
      arch: "x64",
      musl: false,
      external_source: `${baseUrl}x86_64-unknown-linux-gnu.tar.gz`,
    },
    {
      os: "linux",
      arch: "arm64",
      musl: true,
      external_source: `${baseUrl}aarch64-unknown-linux-musl.tar.gz`,
    },
    {
      os: "linux",
      arch: "arm64",
      musl: false,
      external_source: `${baseUrl}aarch64-unknown-linux-gnu.tar.gz`,
    },
    {
      os: "macos",
      arch: "x64",
      external_source: `${baseUrl}x86_64-apple-darwin.tar.gz`,
    },
    {
      os: "macos",
      arch: "arm64",
      external_source: `${baseUrl}aarch64-apple-darwin.tar.gz`,
    },
    {
      os: "windows",
      arch: "x86",
      external_source: `${baseUrl}i686-pc-windows-msvc.zip`,
    },
    {
      os: "windows",
      arch: "x64",
      external_source: `${baseUrl}x86_64-pc-windows-msvc.zip`,
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
