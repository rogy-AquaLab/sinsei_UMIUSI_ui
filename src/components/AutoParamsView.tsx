import { useCallback, useEffect, useState } from 'react'
import {
  type GetParametersRequest,
  type GetParametersResponse,
  type ListParametersRequest,
  type ListParametersResponse,
  RCL_PARAMETER_TYPE,
  type RclParameterValue,
  type SetParametersRequest,
  type SetParametersResponse,
} from '@/msgs/RclInterfacesMsgs'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

// core の auto_target_generator のパラメータ（config/auto_target_generator.yaml、balloon/mission.py の MissionParams）
const NODE = '/auto_target_generator'
const GET = {
  name: `${NODE}/get_parameters`,
  serviceType: 'rcl_interfaces/srv/GetParameters',
}
// rclpy の get_parameters は、宣言されていない名前が 1 つでもあると全部を空で返す。
// 古い core（UI が知っている名前の一部が無い）でも残りを表示できるよう、先に宣言済みの名前を聞く
const LIST = {
  name: `${NODE}/list_parameters`,
  serviceType: 'rcl_interfaces/srv/ListParameters',
}
const SET = {
  name: `${NODE}/set_parameters`,
  serviceType: 'rcl_interfaces/srv/SetParameters',
}
// 呼び出しにタイムアウトが無いので、ノードが居ないときに待ち続けないよう打ち切る
const CALL_TIMEOUT_MS = 3_000

// colors: 文字列の配列（mission.priority）。選択肢は 'red,yellow' のようにカンマでつなぐ
type ParamKind = 'double' | 'integer' | 'bool' | 'select' | 'colors'
type ParamDef = {
  name: string
  label: string
  kind: ParamKind
  options?: readonly string[]
  step?: number
}

// すぐ効く: 検出のしかた。次の Auto から効く: mission.*（Auto に入るたびに読み直す）
const DETECTION: readonly ParamDef[] = [
  {
    name: 'detector',
    label: '検出器（hsv+cnn = 色が主、見つからないときだけ CNN）',
    kind: 'select',
    options: ['hsv', 'cnn', 'hsv+cnn'],
  },
  {
    name: 'cnn_model',
    label: 'CNN のモデル',
    kind: 'select',
    options: ['balloon_cnn_20261007.onnx', 'balloon_cnn_20261015.onnx'],
  },
  { name: 'cnn_conf', label: 'CNN の確信度の下限', kind: 'double', step: 0.05 },
  { name: 'preview', label: 'Auto 以外でも認識を表示', kind: 'bool' },
  {
    name: 'cnn_threads',
    label: 'CNN の推論スレッド数',
    kind: 'integer',
    step: 1,
  },
  {
    name: 'cnn_assist_max_age',
    label: 'hsv+cnn で CNN の結果を使う古さの上限 [s]',
    kind: 'double',
    step: 0.1,
  },
  {
    name: 'cnn_assist_conf',
    label: 'hsv+cnn で使う CNN の確信度の下限',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'cnn_assist_confirm',
    label: 'hsv+cnn で、続けて 2 回見えた CNN だけ使う',
    kind: 'bool',
  },
  {
    name: 'cnn_merge',
    label: 'CNN の重なった箱を 1 個にまとめる',
    kind: 'bool',
  },
]
const MISSION: readonly ParamDef[] = [
  {
    name: 'mission.priority',
    label: '狙う色（左ほど優先。最初の 1 個は first_color）',
    kind: 'colors',
    options: ['red,yellow', 'yellow', 'red', 'yellow,red'],
  },
  {
    name: 'mission.first_color',
    label: '最初に狙う色',
    kind: 'select',
    options: ['yellow', 'red'],
  },
  {
    name: 'mission.max_rams',
    label: '同じ色に続けて突っ込む上限（1 色だけ狙うなら大きく）',
    kind: 'integer',
    step: 1,
  },
  {
    name: 'use_hold_yaw',
    label: '方位保持（hold_yaw、fb でだけ効く）',
    kind: 'bool',
  },
  {
    name: 'mission.aim_x',
    label: '照準 x（針の位置、右が +）',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.aim_y',
    label: '照準 y（針の位置、下が +）',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.ram_tol',
    label: '突進を始める照準のずれ',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.k_yaw',
    label: '横ずれ → 旋回のゲイン',
    kind: 'double',
    step: 0.1,
  },
  {
    name: 'mission.k_yaw_cnn',
    label: '横ずれ → 旋回のゲイン（目標が CNN のとき）',
    kind: 'double',
    step: 0.1,
  },
  {
    name: 'mission.k_heave',
    label: '縦ずれ → 上下のゲイン',
    kind: 'double',
    step: 0.1,
  },
  {
    name: 'mission.near_radius',
    label: '減速する大きさ（半径/幅）',
    kind: 'double',
    step: 0.01,
  },
  {
    name: 'mission.start_delay',
    label: '動き出すまで [s]',
    kind: 'double',
    step: 1,
  },
  {
    name: 'mission.mission_time',
    label: '持ち時間 [s]',
    kind: 'double',
    step: 10,
  },
  {
    name: 'mission.dive_time',
    label: '潜行の打ち切り [s]',
    kind: 'double',
    step: 1,
  },
  {
    name: 'mission.dive_heave',
    label: '潜行の heave',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.approach_surge_far',
    label: '接近 surge（遠）',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.approach_surge_near',
    label: '接近 surge（近）',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.ram_surge',
    label: '突進 surge',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.ram_time',
    label: '突進の時間 [s]',
    kind: 'double',
    step: 0.5,
  },
  {
    name: 'mission.ram_radius',
    label: '突進を始める大きさ（半径/幅）',
    kind: 'double',
    step: 0.01,
  },
  {
    name: 'mission.ram_radius_cnn',
    label: '突進を始める大きさ（目標が CNN のとき。0 = 上と同じ）',
    kind: 'double',
    step: 0.01,
  },
  {
    name: 'mission.backoff_surge',
    label: '後退 surge',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.backoff_time',
    label: '後退の時間 [s]',
    kind: 'double',
    step: 0.5,
  },
  {
    name: 'mission.search_yaw_rate',
    label: '探索の旋回 [rad/s]',
    kind: 'double',
    step: 0.05,
  },
  {
    name: 'mission.max_yaw_rate',
    label: '旋回の上限 [rad/s]',
    kind: 'double',
    step: 0.05,
  },
]
const ALL = [...DETECTION, ...MISSION]

type Value = string | number | boolean

const withTimeout = <T,>(p: Promise<T>) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('応答なし（auto_target_generator が居ない?）')),
        CALL_TIMEOUT_MS,
      )
    }),
  ]).finally(() => clearTimeout(timer))
}

const fromRcl = (
  def: ParamDef,
  v: RclParameterValue | undefined,
): Value | undefined => {
  if (!v || v.type === 0) return undefined
  if (def.kind === 'bool') return v.bool_value
  if (def.kind === 'integer')
    return v.type === RCL_PARAMETER_TYPE.double
      ? Math.round(v.double_value)
      : v.integer_value
  if (def.kind === 'double')
    return v.type === RCL_PARAMETER_TYPE.integer
      ? v.integer_value
      : v.double_value
  if (def.kind === 'colors') return (v.string_array_value ?? []).join(',')
  return v.string_value
}

const toRcl = (def: ParamDef, value: Value) => {
  if (def.kind === 'bool')
    return { type: RCL_PARAMETER_TYPE.bool, bool_value: Boolean(value) }
  // ノードが宣言した型で送る（型が違うと拒否される）。yaml で 15.0 と書いたものは double、2 と書いたものは integer
  if (def.kind === 'integer')
    return {
      type: RCL_PARAMETER_TYPE.integer,
      integer_value: Math.round(Number(value)),
    }
  if (def.kind === 'double')
    return { type: RCL_PARAMETER_TYPE.double, double_value: Number(value) }
  if (def.kind === 'colors')
    return {
      type: RCL_PARAMETER_TYPE.string_array,
      string_array_value: String(value)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    }
  return { type: RCL_PARAMETER_TYPE.string, string_value: String(value) }
}

/**
 * 自律（auto_target_generator）のパラメータを見て変える。ros2 param set の代わり。
 */
const AutoParamsView = () => {
  const session = useRosStore((s) => s.session)
  const connected = useRosStore((s) => s.connectionState === 'connected')
  const notify = useNotificationStore((s) => s.notify)
  const [current, setCurrent] = useState<Record<string, Value>>({})
  const [edits, setEdits] = useState<Record<string, Value>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // clearEdits: 読み直しのボタンと反映の後だけ編集を捨てる。つなぎ直したときの自動の読み直しでは残す
  const load = useCallback(
    async (clearEdits: boolean) => {
      if (!session || !connected) return
      setBusy(true)
      try {
        const listed = await withTimeout(
          session.call<ListParametersRequest, ListParametersResponse>(LIST, {
            prefixes: [],
            depth: 0,
          }),
        )
        const declared = new Set(listed.result.names)
        const defs = ALL.filter((d) => declared.has(d.name))
        const res = await withTimeout(
          session.call<GetParametersRequest, GetParametersResponse>(GET, {
            names: defs.map((d) => d.name),
          }),
        )
        const next: Record<string, Value> = {}
        defs.forEach((def, i) => {
          const v = fromRcl(def, res.values[i])
          if (v !== undefined) next[def.name] = v
        })
        setCurrent(next)
        if (clearEdits) setEdits({})
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [session, connected],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  const apply = async () => {
    if (!session || !connected) return
    const names = Object.keys(edits)
    if (names.length === 0) return
    const bad = names.filter((n) => {
      const def = ALL.find((d) => d.name === n) as ParamDef
      return (
        (def.kind === 'integer' || def.kind === 'double') &&
        (edits[n] === '' || !Number.isFinite(Number(edits[n])))
      )
    })
    if (bad.length) {
      notify(`数値になっていない: ${bad.join(', ')}`, 'error')
      return
    }
    setBusy(true)
    try {
      const defs = names.map((n) => ALL.find((d) => d.name === n) as ParamDef)
      const res = await withTimeout(
        session.call<SetParametersRequest, SetParametersResponse>(SET, {
          parameters: defs.map((def) => ({
            name: def.name,
            value: toRcl(def, edits[def.name]),
          })),
        }),
      )
      const failed = res.results
        .map((r, i) =>
          r.successful ? null : `${names[i]}: ${r.reason || '拒否'}`,
        )
        .filter(Boolean)
      if (failed.length)
        notify(`反映できなかった: ${failed.join(', ')}`, 'error')
      else notify(`${names.length} 件を反映しました`, 'success')
      await load(true)
    } catch (e) {
      notify(
        `反映できなかった: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  const row = (def: ParamDef) => {
    const value = def.name in edits ? edits[def.name] : current[def.name]
    const changed = def.name in edits
    const set = (v: Value) => setEdits((prev) => ({ ...prev, [def.name]: v }))
    let input: React.ReactNode
    if (value === undefined)
      input = (
        <span className="text-base-content/50">—（この core に無い）</span>
      )
    else if (def.kind === 'bool')
      input = (
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={Boolean(value)}
          onChange={(e) => set(e.target.checked)}
        />
      )
    else if (def.kind === 'select' || def.kind === 'colors')
      input = (
        <select
          className="select select-sm w-64"
          value={String(value)}
          onChange={(e) => set(e.target.value)}
        >
          {[...new Set([...(def.options ?? []), String(value)])].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    else
      input = (
        <input
          type="number"
          className="input input-sm w-32"
          step={def.step}
          value={String(value)}
          onChange={(e) => set(e.target.value)}
        />
      )
    return (
      <tr key={def.name} className={changed ? 'bg-warning/10' : ''}>
        <td>
          {def.label}
          <div className="text-xs text-base-content/50">{def.name}</div>
        </td>
        <td>{input}</td>
      </tr>
    )
  }

  const dirty = Object.keys(edits).length
  return (
    <div className="h-full overflow-auto bg-base-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Auto の設定</h1>
          <span className="grow" />
          <button
            type="button"
            className="btn btn-sm"
            disabled={!connected || busy}
            onClick={() => void load(true)}
          >
            読み直す
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={!connected || busy || dirty === 0}
            onClick={() => void apply()}
          >
            反映（{dirty} 件）
          </button>
        </div>
        {!connected && (
          <div className="alert alert-warning">
            rosbridge につながっていません
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <section>
          <h2 className="font-semibold">検出（すぐ効く）</h2>
          <table className="table table-sm">
            <tbody>{DETECTION.map(row)}</tbody>
          </table>
        </section>
        <section>
          <h2 className="font-semibold">
            行動（次に Auto に入ったときから効く）
          </h2>
          <table className="table table-sm">
            <tbody>{MISSION.map(row)}</tbody>
          </table>
        </section>
        <p className="text-sm text-base-content/60">
          ここで変えた値は機体の再起動で yaml の値に戻ります。残したい値は core
          の config/auto_target_generator.yaml に書いてください。
        </p>
      </div>
    </div>
  )
}

export default AutoParamsView
