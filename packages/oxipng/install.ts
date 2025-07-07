import { env, exit } from 'node:process';
import { config, installBinary } from "./shared.js";

const skip_install = Number(env.SKIPI || "0");
if (skip_install) {
  exit(0);
}

const is_installed = await installBinary(true);
if (!is_installed) {
  const messages = [
    `${config.name}: Binary could not be installed.`,
    "  - If you have the proper binary, you can install this package with option `--ignore-scripts` and copy the binary file directly into the package's `vendor` directory.",
    "  - If you're on an OS that has a package manager like `apt` or Homebrew, you can also install the official binary's package globally and retry installing this package.",
  ];

  console.error(messages.join(`\n`));
  exit(1);
}

exit(0);
