import { z } from 'zod/mini'

const terminalIdSchema = z.uuidv4()
const columnsSchema = z.int().check(z.minimum(1), z.maximum(300))
const rowsSchema = z.int().check(z.minimum(1), z.maximum(200))

export const terminalClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('terminal.create'),
    terminalId: terminalIdSchema,
    cols: columnsSchema,
    rows: rowsSchema,
  }),
  z.object({
    type: z.literal('terminal.input'),
    terminalId: terminalIdSchema,
    data: z.string().check(z.maxLength(16_384)),
  }),
  z.object({
    type: z.literal('terminal.resize'),
    terminalId: terminalIdSchema,
    cols: columnsSchema,
    rows: rowsSchema,
  }),
  z.object({
    type: z.literal('terminal.close'),
    terminalId: terminalIdSchema,
  }),
])

export const terminalServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connection.ready'),
    maxTerminals: z.int().check(z.positive()),
  }),
  z.object({
    type: z.literal('terminal.created'),
    terminalId: terminalIdSchema,
    processName: z.string(),
  }),
  z.object({
    type: z.literal('terminal.process'),
    terminalId: terminalIdSchema,
    processName: z.string(),
  }),
  z.object({
    type: z.literal('terminal.output'),
    terminalId: terminalIdSchema,
    data: z.string(),
  }),
  z.object({
    type: z.literal('terminal.exited'),
    terminalId: terminalIdSchema,
    exitCode: z.int(),
    signal: z.optional(z.int()),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
    terminalId: z.optional(terminalIdSchema),
  }),
])

export type TerminalClientMessage = z.infer<typeof terminalClientMessageSchema>
export type TerminalServerMessage = z.infer<typeof terminalServerMessageSchema>

type TerminalErrorMessage = Extract<TerminalServerMessage, { type: 'error' }>

export type TerminalScopedMessage =
  | Exclude<
      TerminalServerMessage,
      { type: 'connection.ready' } | TerminalErrorMessage
    >
  | (TerminalErrorMessage & { terminalId: string })

const parseJson = <Schema extends z.ZodMiniType>(
  value: string,
  schema: Schema,
): z.output<Schema> | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }

  const result = schema.safeParse(parsed)
  return result.success ? result.data : null
}

export const parseTerminalClientMessage = (value: string) =>
  parseJson(value, terminalClientMessageSchema)

export const parseTerminalServerMessage = (value: string) =>
  parseJson(value, terminalServerMessageSchema)

export const isTerminalScopedMessage = (
  message: TerminalServerMessage,
): message is TerminalScopedMessage =>
  message.type !== 'connection.ready' &&
  (message.type !== 'error' || message.terminalId !== undefined)
