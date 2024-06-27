import { arch, platform, report } from "node:process";
import { normalize } from "node:path";
import { readFileSync } from "node:fs";
import npm_arch from "arch";
import { File } from "decompress";

/**
 * @source https://github.com/swc-project/cli/blob/df9b9ec04201ac353c3e794fed6fc29152fc4cb0/src/swcx/index.ts#L73
 */
const isMusl = () =>
  (() => {
    function isMusl() {
      if (!report || typeof report.getReport !== "function") {
        try {
          return readFileSync("/usr/bin/ldd", "utf8").includes("musl");
        } catch (e) {
          return true;
        }
      } else {
        // @ts-ignore:next-line (The type declaration is wrong.)
        const { glibcVersionRuntime } = report.getReport().header;
        return !glibcVersionRuntime;
      }
    }

    return isMusl();
  })();

/**
 * OS platform the environment was compiled for.
 *
 * @source https://nodejs.org/api/process.html#processplatform
 *
 * Possible values:
 *  - aix
 *  - darwin
 *  - freebsd
 *  - linux
 *  - openbsd
 *  - sunos
 *  - win32
 *  - android
 */
const getCompiledForPlatform = () => platform;

type __StandardizeOSs = "win32" | "darwin";
type StandardizedOSs = "windows" | "macos";
type NonStandardizedOSs = Exclude<NodeJS.Platform, __StandardizeOSs>;
export type StandardizeOSs = Exclude<NodeJS.Platform, NonStandardizedOSs>;
export type StandardizedOS = StandardizedOSs | NonStandardizedOSs;

const getPlatform = () => {
  const standardized_platforms: { [key in StandardizeOSs]: StandardizedOS } = {
    win32: "windows",
    darwin: "macos",
  };

  const platform = getCompiledForPlatform();
  return standardized_platforms?.[platform as StandardizeOSs] ?? platform;
};

/**
 * CPU architecture the environment was compiled for.
 *
 * @source https://nodejs.org/api/process.html#processarch
 *
 * Possible values:
 *  - arm
 *  - arm64
 *  - ia32
 *  - loong64
 *  - mips
 *  - mipsel
 *  - ppc
 *  - ppc64
 *  - riscv64
 *  - s390
 *  - s390x
 *  - x64
 */
const getCompiledForArch = () => {
  return arch;
};

const getArch = () => {
  return npm_arch();
};

export type OSConfigObject = {
  arch?: ReturnType<typeof getArch>;
  node_arch?: NodeJS.Architecture;
  musl?: boolean;
} & (
  | {
      os: StandardizedOS;
      node_os?: NodeJS.Platform;
    }
  | {
      os?: StandardizedOS;
      node_os: NodeJS.Platform;
    }
);

export type DestinationConfigObject = OSConfigObject & {
  destination: string;
};

export type PrebuiltConfigObject = OSConfigObject & {
  max_redirects?: number;
  unpack_files_filter?: (file: File) => boolean;
} & (
    | {
        internal_source: string;
        external_source?: string;
      }
    | {
        internal_source?: string;
        external_source: string;
      }
  );

// TODO:
export type BuildConfigObject = PrebuiltConfigObject & {
  commands: string[] | string[][];
};

/**
 * Filter object based on platform and architecture.
 *
 * Adopted from `os-filter-obj` package by Kevin Mårtensson
 * @see https://github.com/kevva/os-filter-obj
 */
const filterObjectByOS = <T extends OSConfigObject>(
  config_object_array: T[],
) => {
  const environment: [keyof OSConfigObject, string | boolean][] = [
    ["os", getPlatform()],
    ["arch", getArch()],
    ["node_os", getCompiledForPlatform()],
    ["node_arch", getCompiledForArch()],
    ["musl", isMusl()],
  ];

  return config_object_array.filter((config_object) =>
    environment.every(
      ([key, value]) => !(key in config_object) || config_object[key] === value,
    ),
  );
};

export function selectSource<T extends OSConfigObject>(
  config_object_array: T[],
): T;
export function selectSource<
  T extends OSConfigObject,
  B extends boolean | undefined,
>(
  config_object_array: T[],
  only_first: B,
): B extends true ? T | undefined : T[];
export function selectSource<
  T extends OSConfigObject,
  B extends boolean | undefined,
  C extends boolean | undefined,
>(
  config_object_array: T[],
  only_first: B,
  throw_error: C,
): B extends false
  ? C extends true
    ? void | T[]
    : T[]
  : C extends true
    ? void | T
    : T | undefined;
export function selectSource<T extends OSConfigObject>(
  config_object_array: T[],
  only_first?: boolean,
  throw_error?: boolean,
) {
  only_first = only_first !== false ? true : false;
  throw_error = throw_error === true;
  const results = filterObjectByOS(config_object_array);

  if (!results?.length && throw_error) {
    throw new Error(
      `Unsupported environment for binaries - platfrom: ${getPlatform()}/${getCompiledForPlatform()} arch: ${getArch()}/${getCompiledForArch()}`,
    );
  }

  return only_first ? results?.[0] : results;
}

export const normalizePath = (filepath = "") => {
  return normalize(filepath).replace(/\\\\/g, "/").replace(/\\/g, "/");
};
