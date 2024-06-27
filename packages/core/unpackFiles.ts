import { mkdirSync, rmSync } from "node:fs";
import decompress from "decompress";

export const unpackFiles = async (
  archive_path = "",
  destination_path = "",
  files_filter: string | ((file: decompress.File) => boolean),
  file_path: null | ((file: decompress.File) => decompress.File) = null,
  delete_archive = false,
): Promise<[false, false, string] | [true, boolean, decompress.File[]]> => {
  // Ensure destination path
  destination_path = destination_path.replace(/\/$/, "");
  try {
    mkdirSync(destination_path, { recursive: true });
  } catch (error) {
    return [
      false,
      false,
      `Could not create destination folder: ${
        (error as Error)?.message ?? "Unknown error"
      }`,
    ];
  }

  const filter =
    typeof files_filter === "string"
      ? (file: decompress.File) =>
          file.type === "file" && file.path === files_filter
      : files_filter;
  const map =
    typeof file_path === "function"
      ? file_path
      : (file: decompress.File) => file;

  if (typeof filter !== "function") {
    return [
      false,
      false,
      "Unpack: Invalid file filter (must be function or string)",
    ];
  }

  if (typeof map !== "function") {
    return [
      false,
      false,
      "Unpack: Invalid file path mapper (must be function or null)",
    ];
  }

  return (await decompress(archive_path, destination_path, {
    filter,
    map,
  })
    .then((files) => {
      // Cleanup archive
      if (delete_archive) {
        try {
          rmSync(archive_path);
        } catch (error) {
          return [true, false, files];
        }
      }

      return [true, true, files];
    })
    .catch((error) => {
      return [false, false, (error as Error)?.message ?? "Unknown error"];
    })) as [false, false, string] | [true, boolean, decompress.File[]];
};
