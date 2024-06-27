#!/usr/bin/env node
import { spawn } from "node:child_process";
import { argv, exit } from "node:process";
import { getBinPath, sanitizeArguments } from "./shared.js";

const bin_path = await getBinPath(true);
const cmd_args = sanitizeArguments(argv.slice(2));

spawn(bin_path, cmd_args, { stdio: "inherit" }).on("exit", exit);
