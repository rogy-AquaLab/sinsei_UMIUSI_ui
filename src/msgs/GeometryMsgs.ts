/**
 * This represents a vector in free space.
 *
 * This is semantically different than a point.
 * A vector is always anchored at the origin.
 * When a transform is applied to a vector, only the rotational component is applied.
 */
export type Vector3 = {
  x: number
  y: number
  z: number
}

/**
 * This represents an orientation in free space in quaternion form.
 */
export type Quaternion = {
  x: number
  y: number
  z: number
  w: number
}
