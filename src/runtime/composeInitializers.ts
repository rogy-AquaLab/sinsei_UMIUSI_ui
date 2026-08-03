export type Disposer = () => void
export type Initializer = () => Disposer

/**
 * 複数の初期化処理をまとめ、初期化した順番の逆順で破棄する
 */
export const composeInitializers = (
  ...initializers: Initializer[]
): Initializer => {
  return () => {
    const disposers: Disposer[] = []

    const disposeAll = () => {
      for (let index = disposers.length - 1; index >= 0; index -= 1) {
        disposers[index]?.()
      }
    }

    try {
      for (const initialize of initializers) {
        disposers.push(initialize())
      }
    } catch (error) {
      disposeAll()
      throw error
    }

    return disposeAll
  }
}
