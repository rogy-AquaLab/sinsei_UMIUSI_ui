// FIXME: いくつかのボタンが足りない
type GamepadInput = {
  axes: {
    l: { x: number; y: number }
    r: { x: number; y: number }
  }
  buttons: {
    arrows: {
      up: boolean
      down: boolean
      left: boolean
      right: boolean
    }
    a: boolean
    b: boolean
    x: boolean
    y: boolean
    l1: boolean
    l2: boolean
    r1: boolean
    r2: boolean
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
        up: buttons[12]?.pressed ?? false,
        down: buttons[13]?.pressed ?? false,
        left: buttons[14]?.pressed ?? false,
        right: buttons[15]?.pressed ?? false,
      },
      a: buttons[0]?.pressed ?? false,
      b: buttons[1]?.pressed ?? false,
      x: buttons[2]?.pressed ?? false,
      y: buttons[3]?.pressed ?? false,
      l1: buttons[4]?.pressed ?? false,
      r1: buttons[5]?.pressed ?? false,
      l2: buttons[6]?.pressed ?? false,
      r2: buttons[7]?.pressed ?? false,
    },
  }
}
