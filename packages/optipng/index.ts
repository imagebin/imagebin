import { Buffer } from "node:buffer";
import { execBuffer, isPng } from "@imagebin/core";
import { getBinPath, sanitizeArguments } from "./shared.js";

export const getArgumentsFromOptions = (options = {}) : string[] | never => {
  const args: string[] = [];

  // TODO: push args for valid options
  // if (!("required_arg" in options)) {
  //   throw new Error("Invalid option!");
  // }

  return sanitizeArguments(args);
};

// Get command or binary
export const bin = await getBinPath(true);

export default (options = {}) => {
  // Build up arguments
  let args: (string | symbol)[] = [];
  try {
    args = getArgumentsFromOptions(options);
    args.push("-out", execBuffer.output, execBuffer.input);
  } catch (err) {
    return Promise.reject(err);
  }

  return async (input: Buffer) => {
    // Only buffers allowed
    if (!Buffer.isBuffer(input)) {
      return Promise.reject(
        new TypeError(
          `Expected \`input\` to be of type \`Buffer\` but received type \`${typeof input}\``
        )
      );
    }

    // Check input file format
    if (!isPng(input)) {
      return Promise.resolve(input);
    }

    return execBuffer({
      input,
      bin,
      args,
    }).catch((error) => {
      error.message = error?.stderr || error?.message;
      throw error;
    });
  };
};
