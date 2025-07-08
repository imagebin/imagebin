import { existsSync } from "node:fs";
import { exit } from "node:process";

if (!existsSync("./dist")) {
  exit(0);
}

exit(1);
