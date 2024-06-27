import { resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import {
  accessSync,
  chmodSync,
  existsSync,
  constants,
  copyFileSync,
} from "node:fs";
import { File } from "decompress";
import { stringIsAValidUrl, downloadSource } from "./downloadSource.js";
import { unpackFiles } from "./unpackFiles.js";
import {
  PrebuiltConfigObject,
  normalizePath,
  selectSource,
} from "./selectSource.js";
import { ConfigObject } from "./index.js";

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

const execFileP = promisify(execFile);

/**
 * Ensures a file is present and executable,
 * or returns the error message.
 */
const ensureIsExecutable = (filepath = "") => {
  if (!filepath?.length) {
    return "Empty or missing filepath";
  }

  try {
    accessSync(filepath, constants.X_OK);
    return "";
  } catch (error) {
    if (error instanceof Error && "code" in error && error?.code === "ENOENT") {
      return `Binary is missing [${filepath}]`;
    }
  }

  try {
    chmodSync(filepath, 0o775);
  } catch (error) {
    return `Binary has no execution permission and could not be given it [${filepath}]`;
  }

  return "";
};

export const getLocalBinPath = async (
  config: ConfigObject,
  throw_error = false,
  skip_install = false,
  suppress_last_error = false
) => {
  const bail = (error = "") => {
    if (throw_error) {
      throw new Error(error);
    }
    return "";
  };

  if (!config?.root?.length) {
    return bail("Missing root directory on config object");
  }

  let is_executable_error = "";

  /**
   * Get destination bin path
   */
  let destination = "";
  const destination_object = selectSource(
    config.destinations,
    true,
    throw_error
  );
  if (destination_object?.destination?.length) {
    // Try global command without extension `.exe` (for Windows only)
    if (
      destination_object.destination.match(/\.exe$/i) &&
      (await runCheck(
        destination_object.destination.replace(/\.exe$/i, ""),
        config.check_command_arguments,
        config.check_command_compare
      ))
    ) {
      return destination_object.destination.replace(/\.exe$/i, "");
    }

    // Try global command
    if (
      await runCheck(
        destination_object.destination,
        config.check_command_arguments,
        config.check_command_compare
      )
    ) {
      return destination_object.destination;
    }

    // Assume local binary
    destination = normalizePath(
      resolve(config.root, `./${destination_object.destination}`)
    );
  }
  if (!destination.length) {
    return bail("No matching binary found for environment");
  }

  /**
   * Check existence and execution permission
   */
  is_executable_error = ensureIsExecutable(destination);
  if (is_executable_error.length === 0) {
    return destination;
  } else if (skip_install) {
    return bail(is_executable_error);
  }

  /**
   * Try copying prebuilt
   */
  const prebuilt_objects = selectSource(config?.prebuilts ?? [], false, false);

  // Try finding a local prebuilt
  const internal_prebuilt =
    prebuilt_objects
      .map((p) => {
        let source = "";
        let np: WithRequired<PrebuiltConfigObject, "internal_source"> = {
          ...p,
          internal_source: "",
        };
        if (
          p?.internal_source?.length &&
          (source = normalizePath(
            resolve(config.root, `./${p.internal_source}`)
          )) &&
          existsSync(source)
        ) {
          np.internal_source = source;
        }

        return np;
      })
      .filter((p) => p.internal_source.length)?.[0]?.internal_source ?? "";

  if (internal_prebuilt.length) {
    try {
      // Copy
      copyFileSync(internal_prebuilt, destination);

      // Check existence and execution permission
      is_executable_error = ensureIsExecutable(destination);
      if (is_executable_error.length === 0) {
        return destination;
      }
    } catch (error) {}
  }

  return suppress_last_error
    ? ""
    : bail(`No suitable binary for ${config.name} could be installed`);
};

export const getInstalledBinPath = async (
  config: ConfigObject,
  throw_error = false,
  skip_install = false
) => {
  const bail = (error = "") => {
    if (throw_error) {
      throw new Error(error);
    }
    return "";
  };

  /**
   * Try using global command or local binary,
   * or get destination path.
   */
  let destination = await getLocalBinPath(
    config,
    throw_error,
    skip_install,
    true
  );
  let is_executable_error = "";

  if (destination.length) {
    return destination;
  }

  /**
   * Get destination bin path
   */
  let destination_path = "";
  const destination_object = selectSource(
    config.destinations,
    true,
    throw_error
  );
  if (destination_object?.destination?.length) {
    destination_path = normalizePath(
      resolve(config.root, `./${destination_object.destination}`)
    );
  }
  const destination_filename = destination_path.split("/").pop() as string;

  /**
   * Try copying prebuilt
   */
  const prebuilt_objects = selectSource(config?.prebuilts ?? [], false, false);

  // Try finding an external source
  const external_prebuilt_config =
    prebuilt_objects
      .map((p) => {
        let source = "";
        let np: WithRequired<PrebuiltConfigObject, "external_source"> = {
          ...p,
          external_source: "",
        };
        if (
          p?.external_source?.length &&
          (source = p.external_source) &&
          stringIsAValidUrl(source)
        ) {
          np.external_source = source;
        }

        return np;
      })
      .filter((p) => p.external_source.length)?.[0] ?? {};
  const external_prebuilt = external_prebuilt_config?.external_source ?? "";
  const max_redirects =
    external_prebuilt_config?.max_redirects ?? config?.max_redirects ?? 0;

  if (external_prebuilt.length) {
    // Try downloading external source
    const [downloadSuccess, downloadedFilenameOrError] = await downloadSource(
      external_prebuilt,
      config.root,
      "",
      max_redirects
    );
    if (!downloadSuccess) {
      return bail(
        `Could not download binary: ${downloadedFilenameOrError}\n    Source url: ${external_prebuilt}\n    Max redirects: ${max_redirects}`
      );
    }
    const download_destination_path = normalizePath(
      resolve(config.root, `./${downloadedFilenameOrError}`)
    );

    // Check if external source is archive file
    if (downloadedFilenameOrError.match(/\.(zip|tar(\.(gz|bz2))?)$/i)) {
      // Try unpacking external prebuilt
      const fileFilter =
        external_prebuilt_config?.unpack_files_filter ??
        config?.prebuilt_unpack_files_filter ??
        ((file: File) => {
          return (
            file.type === "file" &&
            (file.path === destination_filename ||
              file.path.endsWith(`/${destination_filename}`))
          );
        });
      const filepathMapper = (file: File) => {
        if (
          file.type === "file" &&
          (file.path === destination_filename ||
            file.path.endsWith(`/${destination_filename}`))
        ) {
          file.path = destination_filename;
        } else {
          // Should not happen
          file.path = `temp/${file.path}`;
        }
        return file;
      };
      const [unpackSuccess, cleanupSuccess, unpackedFilesOrError] =
        await unpackFiles(
          download_destination_path,
          config.root,
          fileFilter,
          filepathMapper,
          true // remove archive after unpacking
        );
      if (
        !unpackSuccess ||
        unpackedFilesOrError.filter(fileFilter).length === 0
      ) {
        return bail(
          `Could not unpack downloaded binary: ${unpackedFilesOrError}`
        );
      } else if (!cleanupSuccess) {
        // Non-essential error
        // return bail('Could not cleanup downloaded binary archive');
      }
    } else {
      // Non-archive file, check if it is the binary
      if (downloadedFilenameOrError !== destination_filename) {
        return bail(
          `Downloaded file is not an archive nor the binary: ${download_destination_path}`
        );
      }
    }

    // Check existence and execution permission
    try {
      is_executable_error = ensureIsExecutable(destination_path);
      if (is_executable_error.length === 0) {
        return destination_path;
      }
    } catch (error) {}
  }

  /**
   * Try compiling from source
   * @todo Maybe only built on deploy of new bin_version in package.json? (through GitHub CI)
   * - multi artifacts } pack + release with prebuilts
   *
   * -- find source (copy local or download external)
   * -- execute commands
   * -- copy result to destination + set exec permission
   * -- if all ok: return destination
   */

  return bail(`No suitable binary for ${config.name} could be installed`);
};

const runCheck = async (
  bin_path: string,
  args: string[],
  check: (stdout: string) => boolean
) => {
  let check_is_ok = false;

  await execFileP(bin_path, args)
    .then(({ stdout, stderr }) => {
      // console.log(stdout);
      // console.log(stderr);
      check_is_ok = check(stdout) ? true : false;
    })
    .catch((error) => {
      // throw error;
    });

  return check_is_ok;
};

/**
 * Ensure the binary is installed
 */
export const ensureBinaryIsInstalled = async (
  config: ConfigObject,
  throw_error = true
): Promise<boolean> => {
  let check_is_ok = false;
  let bin_path = "";

  // Try global command or local binary
  bin_path = await getLocalBinPath(config, false, false);
  if (bin_path.length) {
    check_is_ok = await runCheck(
      bin_path,
      config.check_command_arguments,
      config.check_command_compare
    );

    if (check_is_ok) {
      return true;
    }
  }

  // Try download or build binary
  bin_path = await getInstalledBinPath(config, throw_error, false);
  if (bin_path.length) {
    check_is_ok = await runCheck(
      bin_path,
      config.check_command_arguments,
      config.check_command_compare
    );

    if (check_is_ok) {
      return true;
    } else if (throw_error) {
      throw new Error("Binary check was unsuccessful");
    }
  }

  return false;
};
