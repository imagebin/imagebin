import {existsSync} from 'node:fs';
import {execSync} from 'node:child_process';

if (!existsSync('./dist')) {
  execSync('npm run build --if-present');
}
