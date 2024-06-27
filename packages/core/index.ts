import { File } from "decompress";
import {
  BuildConfigObject,
  DestinationConfigObject,
  PrebuiltConfigObject,
} from "./selectSource.js";

export * from "./loadConfig.js";
export * from "./selectSource.js";
export * from "./getInstalledBinPath.js";
export * from "./downloadSource.js";
export * from "./unpackFiles.js";
export * from "./execBuffer.js";
export * from "./formatCheckers.js";

export type CustomConfigObject = {
  bin_version: string;
  destinations: DestinationConfigObject[];
  prebuilt_unpack_files_filter?: (file: File) => boolean;
  max_redirects?: number;
} & (
  | {
      prebuilts: PrebuiltConfigObject[];
      builds?: BuildConfigObject[];
    }
  | {
      prebuilts?: PrebuiltConfigObject[];
      builds: BuildConfigObject[];
    }
);

export type ConfigObject = CustomConfigObject & {
  name: string;
  version: string;
  root: string;
  check_command_arguments: string[];
  check_command_compare: (stdout: string) => boolean;
  source?: string;
};
