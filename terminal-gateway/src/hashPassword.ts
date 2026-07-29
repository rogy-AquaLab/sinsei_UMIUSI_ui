import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { hashPassword } from './password.js'

const readline = createInterface({ input: stdin, output: stdout })

try {
  const password = await readline.question('Terminal password: ')
  if (!password) {
    throw new Error('Password must not be empty.')
  }
  console.log(await hashPassword(password))
} finally {
  readline.close()
}
