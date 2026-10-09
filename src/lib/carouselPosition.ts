export function wrapIndex(position: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.round(position) % count) + count) % count;
}

export function circularOffset(index: number, position: number, count: number): number {
  if (count <= 0) return 0;
  let offset = (index - position) % count;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}
