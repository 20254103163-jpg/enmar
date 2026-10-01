import { defineConfig } from 'prisma/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
})
