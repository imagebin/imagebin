import { URL } from "node:url";
import { createWriteStream, mkdirSync } from "node:fs";
import { get as getHttp } from "node:http";
import { get as getHttps } from "node:https";
import { normalizePath } from "./selectSource.js";

const get = {
  http: getHttp,
  https: getHttps,
};

/**
 * Check if a string is a valid url.
 * Optionally restrict the allowed protocols (default: http/https).
 * @source https://stackoverflow.com/a/55585593/2142071
 */
export const stringIsAValidUrl = (
  s: string,
  protocols: false | string[] = ["http", "https"]
) => {
  protocols =
    protocols && Array.isArray(protocols)
      ? protocols.map((x) =>
          typeof x === "string" ? `${x.toLowerCase()}:` : ""
        )
      : false;

  try {
    const url = new URL(s);
    return protocols
      ? url.protocol
        ? protocols.includes(url.protocol)
        : false
      : true;
  } catch (error) {
    return false;
  }
};

/**
 * Get filename from content download header.
 * @source https://stackoverflow.com/a/67994693/2142071
 */
const getFileNameFromContentDispositionHeader = (disposition: string) => {
  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-\.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /^filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  let fileName = "";
  let matches = utf8FilenameRegex.exec(disposition);
  if (matches != null) {
    fileName = decodeURIComponent(matches[1]);
  } else {
    // Prevent ReDos attacks by anchoring the ascii regex to string start and
    // slicing off everything before 'filename='
    const filenameStart = disposition.toLowerCase().indexOf("filename=");
    if (filenameStart >= 0) {
      matches = asciiFilenameRegex.exec(disposition.slice(filenameStart));
      if (matches != null && matches[2]) {
        fileName = matches[2];
      }
    }
  }
  return fileName;
};

const retry = async (
  source_url = "",
  target_path = "",
  target_filename = "",
  max_redirects = 0,
  redirect = 0
): Promise<[boolean, string]> => {
  if (!redirect || typeof redirect !== "number") {
    redirect = 0;
  } else {
    redirect = Math.round(redirect);
  }

  if (
    !source_url ||
    typeof source_url !== "string" ||
    !source_url.length ||
    !stringIsAValidUrl(source_url)
  ) {
    return [false, `Invalid source url: ${source_url}`];
  }

  const protocol = source_url.startsWith("http:") ? "http" : "https";
  const result = await new Promise<[boolean, string]>((resolve, reject) => {
    // Get file
    try {
      get[protocol](source_url, (res) => {
        switch (res?.statusCode) {
          case 200:
            // Success
            let filename = target_filename;
            if (filename.length === 0) {
              filename =
                normalizePath(
                  getFileNameFromContentDispositionHeader(
                    res.headers?.["content-disposition"] || ""
                  )
                )
                  .split("/")
                  .pop() || "";
            }
            if (filename.length === 0) {
              reject(
                new Error(
                  "No target filename specified or found in download headers"
                )
              );
              break;
            }

            const writeStream = createWriteStream(`${target_path}${filename}`);

            writeStream.on("finish", () => {
              writeStream.close();
              resolve([true, filename]);
            });

            res.pipe(writeStream);
            break;
          case 301:
          case 302:
            // Redirect (maybe)
            if (redirect + 1 > max_redirects) {
              reject(new Error(`Max. redirects (${max_redirects}) reached`));
              break;
            }

            return retry(
              res?.headers?.location ?? "",
              target_path,
              target_filename,
              max_redirects,
              redirect + 1
            )
              .then(resolve)
              .catch(reject);
          default:
            // Error unhandled statusCode
            reject(
              new Error(
                `Failed with statuscode ${res?.statusCode || "(unknown)"}`
              )
            );
            break;
        }
      }).on("error", (error) => {
        // Error in response
        reject(error);
      });
    } catch (error) {
      // Error with get
      reject(error);
    }
  }).catch((error) => {
    return [
      false,
      `Could not download file${redirect ? ` [redirect ${redirect}]` : ""}: ${
        error?.message ?? "Unknown error"
      }`,
    ];
  });

  return [result[0] ? true : false, `${result[1]}`];
};

export const downloadSource = async (
  source_url = "",
  target_path = "",
  target_filename = "",
  max_redirects = 0
): Promise<[boolean, string]> => {
  if (!target_path || typeof target_path !== "string" || !target_path.length) {
    return [false, "Empty or invalid target"];
  }

  if (
    !target_filename ||
    typeof target_filename !== "string" ||
    !target_filename.length
  ) {
    target_filename = "";
  }

  try {
    mkdirSync(target_path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
      return [
        false,
        `Could not create target folder: ${
          (error as Error)?.message ?? "Unknown error"
        }`,
      ];
    }
  }

  if (!max_redirects || typeof max_redirects !== "number") {
    max_redirects = 0;
  } else {
    max_redirects = Math.round(max_redirects);
  }

  const result = await retry(
    source_url,
    target_path,
    target_filename,
    max_redirects
  );

  return [result[0] ? true : false, `${result[1]}`];
};
