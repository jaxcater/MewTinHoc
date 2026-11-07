# Đuôi mèo mobile — 07/11/2026

- Tạo bằng công cụ image_gen tích hợp, nền trong suốt.
- Ảnh gốc: src/assets/hero-mobile-tail.png.
- Asset dùng trong giao diện: src/assets/hero-mobile-tail.webp (212.620 byte).
- WebP giữ nguyên bố cục, kích thước 1024 × 1536 và alpha của ảnh gen; chỉ đổi cách mã hoá để giảm dung lượng tải mobile.
- Chuyển động dùng toàn bộ ảnh liền khối, không chia mảnh hay ghép khớp.

## Prompt

Create ONE standalone production website asset: ONLY the fluffy tail of an orange tabby cat hanging DOWN vertically from the top edge, no cat body or head, no paws or accessories, no frame or background. Traditional handmade oil pastel and coloured pencil on coarse paper, tactile grain, warm golden orange fur with irregular burnt-orange tabby stripes and a soft cream-orange rounded tip. Match a charming imperfect children's picture-book orange tabby illustration, not glossy 3D, not vector, not photorealistic. Tall narrow portrait composition. Crucial attachment geometry: the tail ROOT is cropped cleanly by the TOP EDGE of the canvas at x=60% of canvas width, y=0; no transparent gap above the root. Tail descends in one long flowing continuous S curve: starts pointing straight downward from that root, curves gently to viewer's left in the middle, and the final third curls back slightly to the right into a soft rounded tip. It must read as a dangling cat tail, NOT a feather, snake, horn, hook or question mark. The entire tail is uninterrupted with no segment cuts or joints. Medium fluffy thickness, approximately 20% of canvas width along the shaft, tapering softly toward the rounded tip. Leave transparent space around the sides and 6% below the tip. Root around x60%, lower tip around x45%. No separate body part at top, no shadow, NO text, NO border. Output true transparent alpha, portrait canvas approximately 2:3. This will be attached at the top right of an orange UI banner and animated as a single continuous piece.
