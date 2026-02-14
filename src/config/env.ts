import { resolve, sep, join } from 'path'
import { config } from 'dotenv'

// Determina a raiz do projecto com base em __dirname
//   Dev (ts-node):  __dirname = .../src/config/        → subir 2 níveis
//   Prod (compiled): __dirname = .../build/src/config/ → subir 3 níveis
const isCompiled = __dirname.includes(sep + 'build' + sep) || __dirname.endsWith(sep + 'build');
const projectRoot = isCompiled
  ? resolve(__dirname, '..', '..', '..')
  : resolve(__dirname, '..', '..');

config({ path: join(projectRoot, '.env') });