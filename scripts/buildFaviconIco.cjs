/**
 * Đóng gói các PNG đã tạo thành favicon.ico đa kích thước.
 *
 * Định dạng ICO (theo spec của Microsoft):
 *   ICONDIR       : reserved(2) | type(2)=1 | count(2)
 *   ICONDIRENTRY  : width(1) | height(1) | palette(1) | reserved(1)
 *                   | planes(2) | bitCount(2) | bytesInRes(4) | imageOffset(4)
 *   rồi tới dữ liệu từng ảnh.
 *
 * Ảnh trong ICO ở đây là PNG (được hỗ trợ từ Windows Vista và mọi trình duyệt
 * hiện đại), nên không cần mã hoá BMP thủ công.
 *
 * Cách dùng: node scripts/buildFaviconIco.cjs
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_IMG = path.join(__dirname, '..', 'public', 'img');

// Kích thước đưa vào .ico. 16/32 là tab trình duyệt, 48 là shortcut Windows.
const SIZES = [16, 32, 48];

function readPng(size) {
  const file = path.join(PUBLIC_IMG, `favicon-${size}.png`);
  if (!fs.existsSync(file)) {
    throw new Error(`Thiếu file ${file}. Chạy bước tạo PNG trước.`);
  }
  return fs.readFileSync(file);
}

function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4); // số ảnh

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  entries.forEach((entry, i) => {
    const base = i * 16;
    // 0 nghĩa là 256px, nhưng với 16/32/48 ta ghi đúng giá trị.
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, base);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1);
    dir.writeUInt8(0, base + 2); // số màu trong palette (0 = truecolor)
    dir.writeUInt8(0, base + 3); // reserved
    dir.writeUInt16LE(1, base + 4); // color planes
    dir.writeUInt16LE(32, base + 6); // bits per pixel
    dir.writeUInt32LE(entry.data.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += entry.data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

const entries = SIZES.map((size) => ({ size, data: readPng(size) }));
const ico = buildIco(entries);

const outFile = path.join(PUBLIC_IMG, 'favicon.ico');
fs.writeFileSync(outFile, ico);

console.log(
  `Đã tạo ${path.relative(process.cwd(), outFile)} (${ico.length} bytes) từ ${SIZES.join(
    ', '
  )}px`
);
