// export isJpg from "is-jpg";
// export isPng from "is-png";
export * as isApng from "is-apng";

/**
 * @source is-jpg
 */
export const isJpg = (buffer: Uint8Array) => {
  if (!buffer || buffer.length < 3) {
    return false;
  }

  return (
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  );
};

/**
 * @source is-png
 */
export const isPng = (buffer: Uint8Array) => {
  if (!buffer || buffer.length < 8) {
    return false;
  }

  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
};
