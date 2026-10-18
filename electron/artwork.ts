import { nativeImage } from 'electron';
export function inspectArtwork(bytes: Buffer) {
  if (!bytes.length || bytes.length > 8_388_608)
    throw new Error('Choose artwork smaller than 8 MB.');
  const extension = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? 'jpg'
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
        ? 'webp'
        : null;
  if (!extension) throw new Error('Choose a PNG, JPEG or WebP image.');
  const image = nativeImage.createFromBuffer(bytes);
  const { width, height } = image.getSize();
  if (
    image.isEmpty() ||
    width < 1 ||
    height < 1 ||
    width > 20000 ||
    height > 20000 ||
    width * height > 40_000_000
  )
    throw new Error(
      'The image could not be read or is too large. Choose a smaller PNG, JPEG or WebP.',
    );
  return { width, height, extension };
}
