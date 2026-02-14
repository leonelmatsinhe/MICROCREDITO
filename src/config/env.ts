import { resolve } from 'path'
import { config } from 'dotenv'

// Quando compilado, __dirname é build/src/config/, então precisamos subir 3 níveis
// Quando em dev (ts-node), __dirname é src/config/, então subir 2 níveis
// Tenta ambos os caminhos para compatibilidade
const envPath1 = resolve(__dirname, '../../../.env'); // para build/src/config/
const envPath2 = resolve(__dirname, '../../.env');     // para src/config/

const result = config({ path: envPath1 });
if (result.error) {
  config({ path: envPath2 });
}