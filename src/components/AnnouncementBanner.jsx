import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, PartyPopper, BellRing, CalendarHeart, X, Check, Star } from 'lucide-react';
import {
  fetchActiveAnnouncements,
  getDismissedMap,
  dismissAnnouncement,
  DISMISS_TTL_NORMAL_MS,
  DISMISS_TTL_IMPORTANT_MS
} from '../lib/announcementService.js';
import './announcement-banner.css';
import AnnouncementMessage from './AnnouncementMessage.jsx';

const TYPE_ICONS = {
  info: Megaphone,
  success: PartyPopper,
  important: BellRing,
  event: CalendarHeart
};

const MAX_VISIBLE = 3;
// Phải >= thời lượng exit trong announcement-banner.css (200ms)
const LEAVE_MS = 210;
// Thông báo QUAN TRỌNG: phải chờ bấy nhiêu giây mới được tick "Không hiển thị lại"
const LOCK_SECONDS = 4;

/**
 * Hộp thông báo của Admin gửi tới mọi người truy cập web.
 * - Thông báo thường: xếp ở góc dưới trái.
 * - Thông báo gắn tag QUAN TRỌNG: hiện giữa màn hình, làm mờ nền; hiện lần lượt từng cái.
 * - Nút X: ẩn trong phiên hiện tại (tải lại trang sẽ hiện lại).
 * - Tick "Không hiển thị lại": ghi nhớ trên trình duyệt kèm thời hạn —
 *   thông báo thường 24 giờ, thông báo QUAN TRỌNG 12 giờ; hết hạn thì hiện lại.
 */
export default function AnnouncementBanner() {
  const [items, setItems] = useState([]);
  // Thông báo đã tick "không hiển thị lại": map { [id]: thời điểm hết hạn (ms) }
  const [dismissed, setDismissed] = useState(() => getDismissedMap());
  // Thông báo bị ẩn trong phiên hiện tại (nút X / "Đã hiểu")
  const [sessionHiddenIds, setSessionHiddenIds] = useState(() => new Set());
  const [leavingIds, setLeavingIds] = useState(() => new Set());
  // Đếm ngược mở khoá ô "Không hiển thị lại" của thông báo QUAN TRỌNG (gắn theo id để mỗi thông báo tự đếm lại)
  const [countdown, setCountdown] = useState({ id: null, left: LOCK_SECONDS });
  const modalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveAnnouncements().then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Đếm ngược tới thời điểm hết hạn gần nhất -> thông báo tự hiện lại
  useEffect(() => {
    const expiries = Object.values(dismissed);
    if (expiries.length === 0) return undefined;
    const nextAt = Math.min(...expiries);
    const delay = Math.max(0, nextAt - Date.now()) + 50;
    const timer = setTimeout(() => {
      setDismissed(getDismissedMap());
    }, delay);
    return () => clearTimeout(timer);
  }, [dismissed]);

  /** Ẩn thông báo trong phiên hiện tại (nút X, "Đã hiểu"): tải lại trang sẽ hiện lại. */
  const hide = (id) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    // Chờ animation thoát xong rồi mới gỡ khỏi DOM
    setTimeout(() => {
      setSessionHiddenIds((prev) => new Set(prev).add(id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, LEAVE_MS);
  };

  const handleNeverShow = (id, checked, locked, isImportant) => {
    if (!checked || locked) return;
    // Ghi vào localStorage ngay (giữ nguyên nếu học viên tải lại trang)
    dismissAnnouncement(id, { isImportant });
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      // Ẩn do ghi nhớ đảm nhiệm: không đánh dấu ẩn theo phiên,
      // để thông báo tự hiện lại khi hết hạn ghi nhớ.
      setDismissed(getDismissedMap());
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, LEAVE_MS);
  };

  const remaining = useMemo(
    () => items.filter((a) => !dismissed[a.id] && !sessionHiddenIds.has(a.id)),
    [items, dismissed, sessionHiddenIds]
  );
  const modalItem = remaining.find((a) => a.is_important) || null;
  const toastItems = remaining.filter((a) => !a.is_important).slice(0, MAX_VISIBLE);
  const modalId = modalItem?.id;
  const modalLeaving = modalId ? leavingIds.has(modalId) : false;

  // Dựa trên mốc thời gian thay vì đếm tick để không lệch khi tab bị trình duyệt làm chậm
  useEffect(() => {
    if (!modalId) return undefined;
    const endAt = Date.now() + LOCK_SECONDS * 1000;
    setCountdown({ id: modalId, left: LOCK_SECONDS });

    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setCountdown({ id: modalId, left });
      if (left === 0) clearInterval(timer);
    }, 250);

    return () => clearInterval(timer);
  }, [modalId]);

  // Hộp giữa màn hình: khoá cuộn trang, nhận focus, đóng bằng Escape, trả focus khi xong
  useEffect(() => {
    if (!modalId) return undefined;
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') hide(modalId);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalId]);

  const renderCard = (a, { isModal = false, index = 0 } = {}) => {
    const type = TYPE_ICONS[a.type] ? a.type : 'info';
    const Icon = TYPE_ICONS[type];
    const checkId = `ann-never-${a.id}`;
    const titleId = `ann-title-${a.id}`;
    const leaving = leavingIds.has(a.id);
    // Chỉ thông báo QUAN TRỌNG bị khoá; id khác với đang đếm thì coi như chưa đếm xong (tránh nháy mở khoá ở frame đầu)
    const secondsLeft = isModal ? (countdown.id === a.id ? countdown.left : LOCK_SECONDS) : 0;
    const locked = secondsLeft > 0;
    // Thông báo QUAN TRỌNG ẩn 12 giờ, thông báo thường ẩn 24 giờ rồi tự hiện lại
    const ttlHours = a.is_important ? DISMISS_TTL_IMPORTANT_MS / 3600000 : DISMISS_TTL_NORMAL_MS / 3600000;

    return (
      <article
        key={a.id}
        ref={isModal ? modalRef : undefined}
        tabIndex={isModal ? -1 : undefined}
        role={isModal ? 'alertdialog' : undefined}
        aria-modal={isModal ? 'true' : undefined}
        aria-labelledby={isModal ? titleId : undefined}
        className={`ann-card ann-${type}${isModal ? ' ann-card-modal' : ''}${leaving ? ' ann-leaving' : ''}`}
        style={{ '--i': index }}
      >
        {isModal && (
          <span className="ann-badge">
            <Star size={11} fill="currentColor" aria-hidden="true" />
            Quan trọng
          </span>
        )}

        <div className="ann-head">
          <span className="ann-icon" aria-hidden="true">
            <Icon size={isModal ? 22 : 18} />
          </span>
          <h3 id={titleId} className="ann-title">{a.title}</h3>
          <button
            type="button"
            className="ann-close"
            onClick={() => hide(a.id)}
            aria-label="Đóng thông báo"
            title="Đóng (sẽ hiện lại khi tải lại trang)"
          >
            <X size={16} />
          </button>
        </div>

        <p className="ann-message"><AnnouncementMessage message={a.message} /></p>

        <div className="ann-foot">
          <input
            id={checkId}
            type="checkbox"
            className="ann-check-input"
            disabled={locked}
            onChange={(e) => handleNeverShow(a.id, e.target.checked, locked, !!a.is_important)}
          />
          <label
            htmlFor={checkId}
            className="ann-check-label"
            title={locked
              ? `Vui lòng đọc thông báo, có thể chọn sau ${secondsLeft} giây`
              : `Ẩn thông báo này trong ${ttlHours} giờ, sau đó sẽ hiện lại`}
          >
            <span className="ann-check-box" aria-hidden="true">
              <Check size={12} strokeWidth={3.5} />
            </span>
            Không hiển thị lại
            {locked ? (
              <span className="ann-lock-count" aria-hidden="true">{secondsLeft}s</span>
            ) : (
              <span className="ann-ttl-hint">({ttlHours}h)</span>
            )}
          </label>
          {isModal && (
            <button type="button" className="ann-ok" onClick={() => hide(a.id)}>
              Đã hiểu
            </button>
          )}
        </div>
      </article>
    );
  };

  if (!modalItem && toastItems.length === 0) return null;

  return (
    <>
      {modalItem && (
        <div
          className={`ann-overlay${modalLeaving ? ' ann-overlay-leaving' : ''}`}
          onMouseDown={(e) => {
            // Bấm ra vùng mờ bên ngoài thì đóng (chỉ ẩn trong phiên)
            if (e.target === e.currentTarget) hide(modalItem.id);
          }}
        >
          {renderCard(modalItem, { isModal: true })}
        </div>
      )}

      {toastItems.length > 0 && (
        <section className="ann-stack" aria-label="Thông báo từ MewTinHoc" aria-live="polite">
          {toastItems.map((a, i) => renderCard(a, { index: i }))}
        </section>
      )}
    </>
  );
}
