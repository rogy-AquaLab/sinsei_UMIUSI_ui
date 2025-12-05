// FIXME: いくつかのボタンが足りない
type GamepadInput = {
  axes: {
    l: { x: number; y: number }
    r: { x: number; y: number }
  }
  buttons: {
    arrows: {
      up: GamepadButton
      down: GamepadButton
      left: GamepadButton
      right: GamepadButton
    }
    a: GamepadButton
    b: GamepadButton
    x: GamepadButton
    y: GamepadButton
    l1: GamepadButton
    l2: GamepadButton
    r1: GamepadButton
    r2: GamepadButton
  }
}

export const mapGamepad = ({ axes, buttons }: Gamepad): GamepadInput => {
  // TODO: コントローラーの種類ごとにマッピングを変える
  // 以下はLogicool F310で確認済み
  return {
    axes: {
      l: { x: axes[0], y: axes[1] },
      r: { x: axes[2], y: axes[3] },
    },
    buttons: {
      arrows: {
        up: buttons[12],
        down: buttons[13],
        left: buttons[14],
        right: buttons[15],
      },
      a: buttons[0],
      b: buttons[1],
      x: buttons[2],
      y: buttons[3],
      l1: buttons[4],
      r1: buttons[5],
      l2: buttons[6],
      r2: buttons[7],
    },
  }
}
