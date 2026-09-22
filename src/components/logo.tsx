/* eslint-disable @next/next/no-img-element */

/**
 * The church's logo.
 *
 * The artwork is never recoloured. It is drawn in red and navy for white
 * paper, so anywhere the surface behind it is dark, the caller puts it on a
 * light plate rather than knocking it out to white — the colours are the
 * church's, not ours to change.
 *
 * The figure and cross are fine strokes and turn to mush below about 28px,
 * so use `LogoFull` wherever there is room and keep `LogoMark` for the
 * collapsed sidebar and the browser tab.
 */

/** Intrinsic proportions of the image files. */
const MARK_W = 389;
const MARK_H = 624;
const FULL_W = 1263;
const FULL_H = 742;

export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // `size` is the height: the mark is taller than it is wide, so a square box
  // would shrink it to fit the narrow side and leave it swimming in space.
  const height = size;
  const width = Math.round(size * (MARK_W / MARK_H));
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}

export function LogoFull({
  width = 220,
  className = "",
  alt = "Victory in Christ",
}: {
  width?: number;
  className?: string;
  alt?: string;
}) {
  const height = Math.round(width * (FULL_H / FULL_W));
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
