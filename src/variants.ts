/**
 * ============================================================
 * HỆ THỐNG MOTION DESIGN CHUẨN HOÁ (MewTinHoc Motion Tokens & Variants)
 * ============================================================
 * Tệp này tập trung toàn bộ thông số chuyển động:
 * - Easing curves: cubic-bezier(0.22, 1, 0.36, 1) cho chuyển động tự nhiên
 * - Spring physics: { stiffness: 120, damping: 18 } cho độ nảy nhẹ, tinh tế
 * - Micro & macro durations: 150ms - 900ms
 * - Hỗ trợ chuẩn tiếp cận: prefers-reduced-motion
 */

// 1. EASING CURVES (Chuẩn UX: Vào nhanh, hãm phanh mượt mà tự nhiên)
export const EASINGS = {
  // Cubic-bezier mượt mà chuẩn Apple/Material: nhanh ở đầu, lắng êm ở cuối
  naturalOut: [0.22, 1, 0.36, 1],
  // Vào / ra cân bằng cho các hiệu ứng trôi chậm (ambient)
  easeInOut: [0.4, 0, 0.2, 1],
  // Thoát nhanh cho thao tác đóng/rút lui
  fastExit: [0.4, 0, 1, 1],
  // Ease-out mạnh (Emil Kowalski) cho vào/ra giao diện: khớp biến CSS --ease-out
  emilOut: [0.23, 1, 0.32, 1]
};

// 2. SPRING CONFIGURATIONS (Lực đàn hồi vật lý)
export const SPRINGS = {
  // Spring nảy nhẹ, tinh tế (dùng cho hover nút, mascot, card)
  gentle: {
    type: 'spring',
    stiffness: 120,
    damping: 18,
    mass: 0.8
  },
  // Spring phản hồi nhanh (dùng cho tab switch, pill slide)
  snappy: {
    type: 'spring',
    stiffness: 380,
    damping: 30
  },
  // Spring giảm chấn tới hạn cho pill trượt giữa các tab: damping >= 2*sqrt(stiffness)
  // (~39) nên không vượt đích, pill không tràn ra ngoài khung tab ở tab đầu/cuối
  pill: {
    type: 'spring',
    stiffness: 380,
    damping: 40
  },
  // Spring nảy rõ cho sự kiện vinh danh (Streak claim, level up)
  rewardPop: {
    type: 'spring',
    stiffness: 260,
    damping: 15
  }
};

// 3. THỜI LƯỢNG (Durations)
export const DURATIONS = {
  micro: 0.2,       // 200ms cho hover, tap, focus
  pageExit: 0.15,   // 150ms cho fade-out trang cũ
  tabSwitch: 0.28,  // 280ms cho chuyển tab
  pageEnter: 0.55,  // 550ms cho load nội dung
  countUp: 0.9,     // 900ms cho đếm số
  ambientSlow: 12   // 12s chu kỳ nền trôi nhẹ
};

// Vinh danh hiện nhẹ một lần khi có dữ liệu; không di chuyển các con số đang đọc.
export const leaderboardHonorsVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
export const leaderboardHonorVariants = {
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  visible: { opacity: 1, transform: 'translateY(0)', transition: { duration: DURATIONS.tabSwitch, ease: EASINGS.emilOut } }
};

// Phần thưởng ngày học chỉ chạy khi có bài nộp đủ điều kiện.
export const studyRewardVariants = {
  hidden: (reduced: boolean) => ({ opacity: 0, transform: reduced ? 'translateX(-50%)' : 'translateX(-50%) translateY(24px) scale(0.95)' }),
  visible: (reduced: boolean) => ({ opacity: 1, transform: reduced ? 'translateX(-50%)' : 'translateX(-50%) translateY(0) scale(1)', transition: { duration: DURATIONS.tabSwitch, ease: EASINGS.emilOut } }),
  exit: (reduced: boolean) => ({ opacity: 0, transform: reduced ? 'translateX(-50%)' : 'translateX(-50%) translateY(12px) scale(0.98)', transition: { duration: DURATIONS.pageExit, ease: EASINGS.emilOut } })
};

// 4. VARIANTS: HEADER (Fade-in + trượt xuống 12px)
export const headerMotionVariants = {
  hidden: {
    opacity: 0,
    y: -12
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASINGS.naturalOut
    }
  }
};

// 5. VARIANTS: BANNER CHÀO MỪNG (Fade-in + trượt lên 20px, stagger con 80ms)
export const bannerContainerVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASINGS.naturalOut,
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// Phần tử con bên trong banner (badge -> title -> desc -> actions)
export const bannerItemVariants = {
  hidden: {
    opacity: 0,
    y: 14
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: EASINGS.naturalOut
    }
  }
};

// 6. VARIANTS: 4 THẺ THỐNG KÊ (Stagger từ trái sang phải, delay 90ms mỗi thẻ)
export const statsRowVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15
    }
  }
};

export const statCardVariants = {
  hidden: {
    opacity: 0,
    y: 18
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASINGS.naturalOut
    }
  },
  // Nâng thẻ 4px khi rê chuột (framer ghi transform inline nên CSS :hover transform không có tác dụng)
  hover: {
    y: -4,
    transition: { type: 'spring', duration: 0.35, bounce: 0.15 }
  }
};

// 6b. VARIANTS: LƯỚI 4 KHỐI KIẾN THỨC (stagger 60ms, nâng 3px khi rê chuột)
export const matrixGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
};

export const matrixCardVariants = {
  hidden: {
    opacity: 0,
    y: 16
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: EASINGS.emilOut
    }
  },
  hover: {
    y: -3,
    transition: { type: 'spring', duration: 0.35, bounce: 0.15 }
  }
};

// 7. VARIANTS: THẺ STREAK BÊN PHẢI (Trượt vào từ phải 24px + fade)
export const streakCardVariants = {
  hidden: {
    opacity: 0,
    x: 24
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.65,
      ease: EASINGS.naturalOut,
      delay: 0.18
    }
  }
};

// 8. HOVER & INTERACTION (Transform GPU, không gây repainting)
export const buttonHoverVariants = {
  idle: {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
  },
  hover: {
    y: -2,
    scale: 1.01,
    boxShadow: '0 6px 20px rgba(251, 191, 36, 0.55)',
    transition: SPRINGS.gentle
  },
  tap: {
    scale: 0.97,
    y: 0,
    transition: { duration: 0.1 }
  }
};

export const cardHoverVariants = {
  idle: {
    y: 0,
    boxShadow: 'var(--shadow-sm)'
  },
  hover: {
    y: -4,
    boxShadow: '0 10px 24px -4px rgba(234, 88, 12, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
    transition: SPRINGS.gentle
  }
};

export const iconHoverVariants = {
  idle: {
    rotate: 0,
    scale: 1
  },
  hover: {
    rotate: 4,
    scale: 1.08,
    transition: SPRINGS.gentle
  }
};

// 9. CHUYỂN TRANG / CHUYỂN TAB (AnimatePresence)
// Trang cũ fade-out 150ms, trang mới fade-in + trượt lên 12px trong 300ms
export const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 12
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASINGS.naturalOut
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
};

// 10. PREFERS-REDUCED-MOTION: Phiên bản tối giản cho người dùng nhạy cảm chuyển động
export const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 }
  },
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};
