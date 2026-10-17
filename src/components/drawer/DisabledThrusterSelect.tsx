import { useCallback, useEffect, useState } from 'react'
import {
  type GetParametersRequest,
  type GetParametersResponse,
  RCL_PARAMETER_TYPE,
  type SetParametersRequest,
  type SetParametersResponse,
} from '@/msgs/RclInterfacesMsgs'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

// control の attitude_controller の mixer.disabled_thruster（走行中に切り替えられる）
const NODE = '/attitude_controller'
const PARAM = 'mixer.disabled_thruster'
const GET = {
  name: `${NODE}/get_parameters`,
  serviceType: 'rcl_interfaces/srv/GetParameters',
}
const SET = {
  name: `${NODE}/set_parameters`,
  serviceType: 'rcl_interfaces/srv/SetParameters',
}
const CALL_TIMEOUT_MS = 3_000
const OPTIONS = [
  { value: 'none', label: '4 基' },
  { value: 'lf', label: '3 基（左前 lf を止める）' },
  { value: 'lb', label: '3 基（左後 lb を止める）' },
  { value: 'rb', label: '3 基（右後 rb を止める）' },
  { value: 'rf', label: '3 基（右前 rf を止める）' },
] as const

const withTimeout = <T,>(p: Promise<T>) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('応答なし（attitude_controller が居ない?）')),
        CALL_TIMEOUT_MS,
      )
    }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * 1 基が壊れたときに残り 3 基で動かす。選んだらすぐ反映する（走行中でも効く）。
 */
const DisabledThrusterSelect = () => {
  const session = useRosStore((s) => s.session)
  const connected = useRosStore((s) => s.connectionState === 'connected')
  const notify = useNotificationStore((s) => s.notify)
  const [current, setCurrent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!session || !connected) return
    try {
      const res = await withTimeout(
        session.call<GetParametersRequest, GetParametersResponse>(GET, {
          names: [PARAM],
        }),
      )
      const v = res.values[0]
      // 宣言していない（3 基対応の無い control）ときは type 0
      setCurrent(
        v && v.type === RCL_PARAMETER_TYPE.string ? v.string_value : null,
      )
    } catch {
      setCurrent(null)
    }
  }, [session, connected])

  useEffect(() => {
    void load()
  }, [load])

  const apply = async (value: string) => {
    if (!session || !connected) return
    setBusy(true)
    try {
      const res = await withTimeout(
        session.call<SetParametersRequest, SetParametersResponse>(SET, {
          parameters: [
            {
              name: PARAM,
              value: { type: RCL_PARAMETER_TYPE.string, string_value: value },
            },
          ],
        }),
      )
      const r = res.results[0]
      if (r?.successful)
        notify(
          value === 'none'
            ? '4 基に戻しました'
            : `${value} を止めて 3 基にしました`,
          value === 'none' ? 'success' : 'warning',
        )
      else notify(`切り替えられなかった: ${r?.reason || '拒否'}`, 'error')
    } catch (e) {
      notify(
        `切り替えられなかった: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      )
    } finally {
      await load()
      setBusy(false)
    }
  }

  return (
    <select
      className={`select ${current && current !== 'none' ? 'select-warning' : ''}`}
      id="disabled-thruster-select"
      disabled={!connected || busy || current === null}
      value={current ?? ''}
      onChange={(e) => void apply(e.target.value)}
    >
      {current === null && <option value="">（取得できない）</option>}
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export default DisabledThrusterSelect
