import { chmod, stat } from 'node:fs/promises'
import { join } from 'node:path'

if (process.platform === 'darwin') {
  const helperPath = join(
    process.cwd(),
    'node_modules',
    'node-pty',
    'prebuilds',
    `${process.platform}-${process.arch}`,
    'spawn-helper',
  )

  try {
    const helper = await stat(helperPath)
    if ((helper.mode & 0o100) === 0) {
      await chmod(helperPath, helper.mode | 0o700)
    }
  } catch (error) {
    if (
      !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
    ) {
      throw error
    }
  }
}
