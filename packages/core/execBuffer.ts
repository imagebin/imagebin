/**
 * Adopted and improved by Philip van Heemstra <vanheemstra@gmail.com> (github.com/vheemstra)
 * From original package `exec-buffer` by Kevin Mårtensson <kevinmartensson@gmail.com> (github.com/kevva)
 * @source https://github.com/kevva/exec-buffer
 */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { execa } from "execa";
import { temporaryFile } from "tempy";
import { rimraf } from "rimraf";

type ExecBufferOptions = {
  input: Buffer;
  bin: string;
  args: (string | symbol)[];
  inputPath?: string;
  outputPath?: string;
};

const input = Symbol("inputPath");
const output = Symbol("outputPath");

const execBuffer = async (options?: ExecBufferOptions) => {
  if (!options || typeof options !== 'object') {
    return Promise.reject(new Error("Options object is required"));
  }

  if (!Buffer.isBuffer(options.input)) {
    return Promise.reject(new Error("Input is required"));
  }

  if (!options?.bin || typeof options.bin !== "string") {
    return Promise.reject(new Error("Binary is required"));
  }

  if (!options?.args || !Array.isArray(options.args)) {
    return Promise.reject(new Error("Arguments are required"));
  }

  const inputPath = options?.inputPath || temporaryFile();
  const outputPath = options?.outputPath || temporaryFile();

  options.args = options.args.map((x) =>
    x === input ? inputPath : x === output ? outputPath : x
  );

  return await writeFile(inputPath, options.input)
    .then(() => execa(options.bin, options.args as string[]))
    .then(() => readFile(outputPath))
    .finally(() => Promise.all([rimraf(inputPath), rimraf(outputPath)]));
};

execBuffer.input = input;
execBuffer.output = output;

export { execBuffer };
