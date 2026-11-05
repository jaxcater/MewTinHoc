import React from 'react';
import useReveal from './useReveal';
import { EXAM_BANK } from './landingContent';

/**
 * 03 · Kho đề thi.
 *
 * Khung này dựng đúng giao diện thật của tab "Kho đề thi" trong sản phẩm:
 * thanh tìm kiếm, hai loại tài liệu (Chung / Đề sở), vài dòng tài liệu, và
 * hàng nút Xem trước / Tải về. Đây không phải bản mô phỏng bằng thanh xám:
 * mọi dòng đều có tên tệp, loại và định dạng thật mà kho nhận
 * (src/lib/examDocsStorage.js: DOC_TYPES, ALLOWED_EXTENSIONS, 20 MB).
 *
 * Không có nút "Mở kho đề thi": landing chỉ gây ấn tượng, mở kho thật thì phải
 * đăng nhập ở đầu trang.
 *
 * Khung giao diện mang `data-ui` để bộ đo của dự án biết đây là một mảnh giao
 * diện thật, được giữ đường kẻ và nút như sản phẩm, không phải trang trí.
 */
export default function LandingBank() {
  const sectionRef = useReveal();

  return (
    <section
      className="mtl-section mtl-section--bank mtl-section--field"
      aria-labelledby="bank-heading"
      ref={sectionRef}
    >
      <div className="mtl-shell">
        <div className="mtl-bank">
          <div className="mtl-bank__copy" data-reveal style={{ '--i': 0 }}>
            <span className="mtl-eyebrow">03 / LUYỆN ĐÚNG TRỌNG TÂM</span>
            <h2 className="mtl-h2" id="bank-heading">
              Kho đề thi
            </h2>
            <p className="mtl-p">
              Đề tham khảo, đề sở và ma trận nằm chung một kho. Tìm bằng một từ khoá, xem trước
              ngay trên trình duyệt, không phải tải về rồi mở.
            </p>

            {/* Hai loại tài liệu, nguyên văn từ DOC_TYPES của sản phẩm. */}
            <div className="mtl-bank__types">
              {EXAM_BANK.types.map((type) => (
                <div className="mtl-bank__type" key={type.id}>
                  <span className="mtl-bank__type-label">{type.label}</span>
                  <p className="mtl-bank__type-detail">{type.detail}</p>
                </div>
              ))}
            </div>

            <p className="mtl-small">
              Nhận {EXAM_BANK.formats.join(', ')} · tối đa {EXAM_BANK.limit} mỗi tệp.
            </p>
          </div>

          {/* Mảnh giao diện thật của kho đề. */}
          <div className="mtl-bank__ui" data-ui data-reveal style={{ '--i': 1 }}>
            <div className="mtl-bank__bar">
              <span className="mtl-bank__search" aria-hidden="true">
                Tìm kiếm tài liệu...
              </span>
              <span className="mtl-bank__filter" aria-hidden="true">
                Tất cả
              </span>
            </div>

            <div className="mtl-bank__rows" aria-hidden="true">
              {EXAM_BANK.sample.map((doc, index) => (
                <div className="mtl-bank__row" key={doc.name} style={{ '--row': index }}>
                  <span className="mtl-bank__ext">{doc.meta}</span>
                  <span className="mtl-bank__name">{doc.name}</span>
                  <span className="mtl-bank__tag">{doc.type}</span>
                </div>
              ))}
            </div>

            <div className="mtl-bank__foot" aria-hidden="true">
              <span>Xem trước</span>
              <span>Tải về</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
