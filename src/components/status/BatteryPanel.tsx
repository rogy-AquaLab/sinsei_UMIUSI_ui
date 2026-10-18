import type { ReactNode } from 'react'
import { FaClock, FaQuestionCircle, FaTachometerAlt } from 'react-icons/fa'
import { BMS_POWER_SWITCH, type BmsFaults } from '@/msgs/OriginalMsgs'
import { POWER_SUPPLY_STATUS } from '@/msgs/SensorMsgs'
import { type BmsTelemetryStatus, useBmsStore } from '@/stores/bmsStore'

const BATTERY_TOPIC = '/state/power/battery'
const BMS_TOPIC = '/state/power/bms'

const telemetryConfig: Record<
  BmsTelemetryStatus,
  { label: string; badgeTone: string; icon: typeof FaTachometerAlt }
> = {
  fresh: { label: 'Live', badgeTone: 'badge-success', icon: FaTachometerAlt },
  stale: { label: 'Timeout', badgeTone: 'badge-warning', icon: FaClock },
  unknown: {
    label: 'No data',
    badgeTone: 'badge-ghost',
    icon: FaQuestionCircle,
  },
}

const powerSupplyStatusLabel: Record<number, string> = {
  [POWER_SUPPLY_STATUS.UNKNOWN]: 'Unknown',
  [POWER_SUPPLY_STATUS.CHARGING]: 'Charging',
  [POWER_SUPPLY_STATUS.DISCHARGING]: 'Discharging',
  [POWER_SUPPLY_STATUS.NOT_CHARGING]: 'Idle',
  [POWER_SUPPLY_STATUS.FULL]: 'Full',
}

const powerSwitchConfig: Record<number, { label: string; badgeTone: string }> =
  {
    [BMS_POWER_SWITCH.UNKNOWN]: { label: 'Unknown', badgeTone: 'badge-ghost' },
    [BMS_POWER_SWITCH.INITIALIZING]: {
      label: 'Initializing',
      badgeTone: 'badge-info',
    },
    [BMS_POWER_SWITCH.OFF]: { label: 'Off', badgeTone: 'badge-ghost' },
    [BMS_POWER_SWITCH.PRECHARGE]: {
      label: 'Precharge',
      badgeTone: 'badge-warning',
    },
    [BMS_POWER_SWITCH.ON]: { label: 'On', badgeTone: 'badge-success' },
    [BMS_POWER_SWITCH.FAULT]: { label: 'Fault', badgeTone: 'badge-error' },
  }

const faultLabels: [keyof BmsFaults, string][] = [
  ['precharge', 'Precharge'],
  ['short_circuit', 'Short circuit'],
  ['switch_over_temperature', 'Switch over temp.'],
  ['charge_overcurrent', 'Charge overcurrent'],
]

type TemperatureEntry = [label: string, value: number]

const isNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const formatValue = (value: number | undefined, unit: string, digits = 1) =>
  isNumber(value) ? `${value.toFixed(digits)} ${unit}` : '--'

const formatPercentage = (value: number | undefined) =>
  isNumber(value) ? `${(value * 100).toFixed(0)}%` : '--'

const Stat = ({
  label,
  value,
  children,
}: {
  label: string
  value: ReactNode
  children?: ReactNode
}) => (
  <div className="rounded-lg bg-base-100 p-3">
    <p className="text-xs text-base-content/60">{label}</p>
    <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    {children}
  </div>
)

const Flag = ({
  label,
  active,
  activeLabel,
  inactiveLabel,
  activeTone,
  inactiveTone = 'badge-ghost',
}: {
  label: string
  active: boolean | undefined
  activeLabel: string
  inactiveLabel: string
  activeTone: string
  inactiveTone?: string
}) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span>{label}</span>
    <span
      className={`badge badge-soft badge-sm ${
        active === undefined
          ? 'badge-ghost'
          : active
            ? activeTone
            : inactiveTone
      }`}
    >
      {active === undefined ? 'Unknown' : active ? activeLabel : inactiveLabel}
    </span>
  </div>
)

const BatteryPanel = () => {
  const {
    battery: latestBattery,
    bms: latestBms,
    telemetryStatus,
  } = useBmsStore()
  const isFresh = telemetryStatus === 'fresh'
  const battery = isFresh ? latestBattery : null
  const bms = isFresh ? latestBms : null
  const telemetry = telemetryConfig[telemetryStatus]
  const TelemetryIcon = telemetry.icon

  const powerSwitch = bms
    ? (powerSwitchConfig[bms.power_switch_state] ??
      powerSwitchConfig[BMS_POWER_SWITCH.UNKNOWN])
    : undefined
  const cellVoltages = battery?.cell_voltage ?? []
  const temperatures: TemperatureEntry[] = bms
    ? [
        ['Balance IC', bms.balance_ic_temperature] as TemperatureEntry,
        ['MOSFET', bms.mosfet_temperature] as TemperatureEntry,
        ['Ambient', bms.ambient_temperature] as TemperatureEntry,
        ...bms.additional_temperatures.map(
          (value, index): TemperatureEntry => [`Sensor ${index}`, value],
        ),
      ].filter(([, value]) => isNumber(value))
    : []

  return (
    <section className="min-w-0 rounded-xl border border-base-300 bg-base-200/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span
            className="tooltip tooltip-right"
            data-tip={`${BATTERY_TOPIC}, ${BMS_TOPIC}`}
          >
            Battery
          </span>
        </h2>
        <div className={`badge badge-soft ${telemetry.badgeTone}`}>
          <TelemetryIcon />
          {telemetry.label}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Pack voltage"
            value={formatValue(battery?.voltage, 'V')}
          />
          <Stat label="Current" value={formatValue(battery?.current, 'A', 2)}>
            <p className="text-xs text-base-content/50">
              {battery
                ? (powerSupplyStatusLabel[battery.power_supply_status] ??
                  'Unknown')
                : '--'}
            </p>
          </Stat>
          <Stat
            label="State of charge"
            value={formatPercentage(battery?.percentage)}
          >
            <progress
              className="progress progress-success mt-2 w-full"
              value={isNumber(battery?.percentage) ? battery.percentage : 0}
              max={1}
            />
          </Stat>
          <Stat
            label="State of health"
            value={formatPercentage(bms?.state_of_health)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg bg-base-100 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>Power switch</span>
              <span
                className={`badge badge-soft badge-sm ${
                  powerSwitch?.badgeTone ?? 'badge-ghost'
                }`}
              >
                {powerSwitch?.label ?? 'Unknown'}
              </span>
            </div>
            <Flag
              label="Charge allowed"
              active={bms?.charge_allowed}
              activeLabel="Allowed"
              inactiveLabel="Not allowed"
              activeTone="badge-success"
            />
            <Flag
              label="Balancing"
              active={bms?.balancing}
              activeLabel="Active"
              inactiveLabel="Inactive"
              activeTone="badge-info"
            />
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>Charger voltage</span>
              <span className="font-mono">
                {formatValue(bms?.charger_voltage, 'V')}
              </span>
            </div>
          </div>
          <div className="space-y-2 rounded-lg bg-base-100 p-3">
            {faultLabels.map(([key, label]) => (
              <Flag
                key={key}
                label={label}
                active={bms?.faults[key]}
                activeLabel="Fault"
                inactiveLabel="OK"
                activeTone="badge-error"
                inactiveTone="badge-success"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-base-100 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">Cells</span>
            <span className="font-mono text-xs text-base-content/60">
              min {formatValue(bms?.cell_voltage_min, 'V', 3)} · max{' '}
              {formatValue(bms?.cell_voltage_max, 'V', 3)}
            </span>
          </div>
          {cellVoltages.length === 0 ? (
            <p className="text-sm text-base-content/50">No cell data.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {cellVoltages.map((voltage, index) => {
                const isBalancing = bms?.cell_balancing[index] ?? false
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: セルの並びは固定
                    key={index}
                    className={`rounded-md border p-2 ${
                      isBalancing ? 'border-info bg-info/10' : 'border-base-300'
                    }`}
                  >
                    <p className="text-xs text-base-content/60">
                      Cell {index + 1}
                      {isBalancing && ' · Bal'}
                    </p>
                    <p className="font-mono text-sm">
                      {formatValue(voltage, 'V', 3)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-base-100 p-3">
          <p className="mb-2 text-sm font-medium">Temperatures</p>
          {temperatures.length === 0 ? (
            <p className="text-sm text-base-content/50">No temperature data.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {temperatures.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{label}</span>
                  <span className="font-mono">{formatValue(value, '°C')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default BatteryPanel
