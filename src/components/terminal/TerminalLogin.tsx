import { type FormEvent, useState } from 'react'
import { FaLock } from 'react-icons/fa'
import type { TerminalConnectionState } from '@/terminal/connectionState'

type TerminalLoginProps = {
  state: TerminalConnectionState
  error: string | null
  onConnect: (password: string) => Promise<boolean>
}

const TerminalLogin = ({ state, error, onConnect }: TerminalLoginProps) => {
  const [password, setPassword] = useState('')
  const isBusy = state === 'authorizing' || state === 'connecting'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || isBusy) return

    const connected = await onConnect(password)
    if (connected) setPassword('')
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form
        className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="card-body gap-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <FaLock className="size-5" />
            </div>
            <div>
              <h1 className="card-title">Terminal access</h1>
              <p className="text-sm text-base-content/60">
                Enter the robot terminal password to connect.
              </p>
            </div>
          </div>

          <label className="form-control gap-2">
            <span className="label-text font-medium">Password</span>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isBusy}
            />
          </label>

          {error && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!password || isBusy}
          >
            {isBusy && <span className="loading loading-spinner loading-sm" />}
            {state === 'authorizing'
              ? 'Authorizing...'
              : state === 'connecting'
                ? 'Connecting...'
                : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TerminalLogin
