import { chmod, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

if (process.platform === 'darwin') {
  const require = createRequire(import.meta.url)
  const nodePtyDirectory = dirname(require.resolve('node-pty/package.json'))
  const helperPath = join(
    nodePtyDirectory,
    'prebuilds',
    `${process.platform}-${process.arch}`,
    'spawn-helper',
  )

  const helper = await stat(helperPath)
  if ((helper.mode & 0o100) === 0) {
    await chmod(helperPath, helper.mode | 0o700)
  }
}
