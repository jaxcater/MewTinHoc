import React from 'react';
import { Lock, Sparkles, ArrowRight, Home, Bot, Check, ShieldAlert, Trophy } from 'lucide-react';
import './demo-gate.css';

/**
 * Nội dung thông báo cho từng chức năng bị khoá với tài khoản Demo.
 * Tất cả text được gom về một chỗ để dễ chỉnh sửa và dùng lại ở
 * Navbar (toast), Kho đề thi, Tạo đề AI và khung chat CamCam.
 */
export const DEMO_LOCKED_CONTENT = {
  arena: {
    icon: Trophy,
    badge: 'Đấu trường kiến thức',
    title: 'Đăng nhập để cùng nhau tranh tài',
    description: 'Dùng tài khoản Google để ghép trận, tạo phòng cùng bạn bè và nhận EXP khi về đích.',
    perks: ['Ba người cùng thi đấu với một đề', '20 câu hỏi trong 15 phút', 'Hạng nhất nhận 100 EXP, hạng nhì nhận 50 EXP'],
    toast: 'Đăng nhập bằng Google để vào Đấu trường nhé!',
  },
  exams: {
    icon: Home,
    badge: 'Chức năng bị khoá',
    title: 'Kho đề thi thử chưa mở cho tài khoản Demo',
    description:
      'Tài khoản Demo chỉ được trải nghiệm Trang chủ và Lộ trình học để làm quen. Kho đề thi thử cùng toàn bộ tài liệu ôn tập chỉ mở cho tài khoản đăng nhập bằng Google.',
    perks: [
      'Tải về toàn bộ đề thi thử chuẩn cấu trúc Bộ GD&ĐT',
      'Xem trước tài liệu ôn tập ngay trên trình duyệt',
      'Lưu lịch sử làm bài và kết quả của riêng bạn',
    ],
    toast: 'Kho đề thi thử chưa mở cho tài khoản Demo. Đăng nhập bằng Google để xem toàn bộ đề nhé!',
  },
  aiExam: {
    icon: Sparkles,
    badge: 'Chức năng bị khoá',
    title: 'Tạo bài thi thử chưa mở cho tài khoản Demo',
    description:
      'Chức năng tạo đề và đánh giá năng lực bằng AI cần tài khoản thật để lưu bài làm, chấm điểm và theo dõi tiến bộ của bạn qua từng lần thi.',
    perks: [
      'Mỗi lần tạo là một đề mới theo ma trận chuẩn',
      'Chấm điểm và đánh giá phân hoá bằng AI',
      'Lưu điểm số, độ chính xác để xem lại sau',
    ],
    toast: 'Tạo bài thi thử chưa mở cho tài khoản Demo. Đăng nhập bằng Google để bắt đầu làm đề nhé!',
  },
  chat: {
    icon: Bot,
    badge: 'CamCam đang khoá',
    title: 'CamCam chưa thể trò chuyện với tài khoản Demo',
    description:
      'Trợ lý CamCam cần biết bạn là ai. Tài khoản Demo chưa được cấp quyền chat.',
    perks: [
      'Hỏi đáp kiến thức Tin học THPTQG 24/7',
      'Ghi nhớ ngữ cảnh đoạn hội thoại của bạn',
      'Lưu lại lịch sử để ôn tiếp khi quay lại',
    ],
    toast: 'CamCam chưa thể trò chuyện với tài khoản Demo. Đăng nhập bằng Google để hỏi bài nhé!',
  },
};

/**
 * Khối thông báo "chức năng bị khoá" dùng chung.
 *
 * variant:
 *  - 'page'    : chiếm trọn nội dung tab (Kho đề thi, Tạo đề AI)
 *  - 'compact' : gọn hơn, dùng bên trong khung chat CamCam
 */
export default function DemoLockedView({
  feature = 'exams',
  variant = 'page',
  onUpgrade,
  onGoHome,
  upgradeLabel = 'Đăng nhập bằng Google',
}) {
  const content = DEMO_LOCKED_CONTENT[feature] || DEMO_LOCKED_CONTENT.exams;
  const isCompact = variant === 'compact';

  return (
    <section
      className={`demo-gate demo-gate--${variant}`}
      role="alert"
      aria-live="polite"
      data-feature={feature}
    >
      <div className="demo-gate__icon" aria-hidden="true">
        {isCompact ? <Lock size={22} /> : <Lock size={30} />}
      </div>

      <span className="demo-gate__badge">
        <ShieldAlert size={13} />
        {content.badge}
      </span>

      <h2 className="demo-gate__title">{content.title}</h2>
      <p className="demo-gate__desc">{content.description}</p>

      {!isCompact && (
        <ul className="demo-gate__list">
          {content.perks.map((perk) => (
            <li key={perk}>
              <Check size={15} />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="demo-gate__actions">
        {onUpgrade && (
          <button type="button" className="demo-gate__btn-primary" onClick={onUpgrade}>
            <span>{upgradeLabel}</span>
            <ArrowRight size={16} />
          </button>
        )}
        {!isCompact && onGoHome && (
          <button type="button" className="demo-gate__btn-ghost" onClick={onGoHome}>
            <Home size={16} />
            <span>Về trang chủ</span>
          </button>
        )}
      </div>

      {!isCompact && (
        <p className="demo-gate__hint">
          Bạn đang dùng <strong>tài khoản Demo (Học viên mẫu)</strong>. Mọi tiến bộ trong phiên
          Demo sẽ không được lưu lại sau khi đóng tab.
        </p>
      )}
    </section>
  );
}
