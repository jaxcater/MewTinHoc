/**
 * Nội dung Landing Page MewTinHoc.
 *
 * Mọi con số ở đây đều lấy từ dữ liệu thật của sản phẩm:
 *  - Cấu trúc đề: src/data/roadmap/csRoadmap.js (CS_EXAM_STRUCTURE)
 *  - Lộ trình 12 tuần: src/data/roadmap/*.js (CS_12_WEEK_PLAN)
 *  - Các trạm: src/data/roadmap/*.js (station list)
 *  - Câu hỏi mẫu: src/data/questions/chuong1.js (CHUONG_1_QUIZ)
 * Không có số liệu nào được bịa thêm (không "98% học viên đạt 8+", không testimonial).
 */

// ── Cấu trúc đề thi: 24 câu trắc nghiệm + 4 câu Đúng/Sai trong 50 phút ──────
export const EXAM_PARTS = [
  {
    id: 'part-1',
    label: 'Phần I',
    format: '24 câu trắc nghiệm',
    detail: 'Mỗi câu bốn lựa chọn, 0,25 điểm một câu.',
    score: '6,0',
    unit: 'điểm',
  },
  {
    id: 'part-2',
    label: 'Phần II',
    format: '4 câu Đúng / Sai',
    detail: 'Mỗi câu bốn ý a, b, c, d. Chấm lũy tiến, tối đa 1,0 điểm một câu.',
    score: '4,0',
    unit: 'điểm',
  },
];

// ── Lộ trình 12 tuần: ba giai đoạn, mục tiêu điểm thật ───────────────────────
export const PHASES = [
  {
    id: 'phase-1',
    weeks: 'Tuần 1–4',
    name: 'Nền tảng',
    title: 'Ôn chắc sáu chủ đề chung',
    target: '4,5 – 5,0',
    stations: ['Trí tuệ nhân tạo', 'Mạng máy tính', 'Văn hóa số', 'Cơ sở dữ liệu', 'HTML & CSS', 'Hướng nghiệp'],
    note: 'Sáu chủ đề dùng chung cho cả hai định hướng. Nắm chắc phần này là đã giữ được nửa số điểm.',
  },
  {
    id: 'phase-2',
    weeks: 'Tuần 5–9',
    name: 'Chuyên sâu',
    title: 'Đào sâu phần riêng của định hướng',
    target: '7,5 – 8,5',
    stations: ['Python cơ bản', 'Kĩ thuật lập trình', 'SQL nâng cao', 'Học máy'],
    note: 'Định hướng Khoa học máy tính đi vào Python, thuật toán và truy vấn. Định hướng Tin học ứng dụng đi vào bảng tính và thiết kế web.',
  },
  {
    id: 'phase-3',
    weeks: 'Tuần 10–12',
    name: 'Về đích',
    title: 'Luyện đề 50 phút và bắt bẫy Đúng/Sai',
    target: '9,0 – 10',
    stations: ['Đề tổng hợp', 'Bảng ma trận năng lực', 'Chiến thuật lũy tiến'],
    note: 'Mỗi câu Đúng/Sai có bốn ý độc lập. Ăn chắc từng ý thay vì đoán cả câu là cách giữ trọn một điểm.',
  },
];

// ── Hai định hướng của chương trình 2018 ────────────────────────────────────
// `stages` lấy nguyên văn từ src/data/roadmap/csRoadmap.js và ictRoadmap.js
// (csRoadmapStations, ictRoadmapStations) để mục lục hiện ra ở landing khớp với
// lộ trình thật bên trong sản phẩm. Chỉ tên chủ đề, không kèm PDF hay bài kiểm tra.
export const TRACKS = [
  {
    id: 'cs',
    code: 'KHMT',
    name: 'Khoa học máy tính',
    accent: 'orange',
    stations: 10,
    focus: 'Python, thuật toán, cơ sở dữ liệu, học máy',
    lead: 'Dành cho bạn muốn đi sâu vào lập trình và khoa học dữ liệu.',
    stages: [
      {
        title: 'Kiến thức chung',
        note: 'Sáu chủ đề đầu giống hệt định hướng Tin học ứng dụng.',
        items: [
          'Giới thiệu Trí tuệ nhân tạo',
          'Mạng máy tính và Internet',
          'Đạo đức, pháp luật và văn hoá trong môi trường số',
          'Giới thiệu các hệ Cơ sở dữ liệu',
          'Tạo trang web với HTML và CSS',
          'Hướng nghiệp với tin học',
        ],
      },
      {
        title: 'Chuyên sâu Khoa học máy tính',
        note: 'Ba chủ đề chỉ có ở định hướng này.',
        items: ['Lập trình Python cơ bản', 'Kĩ thuật lập trình', 'Học máy và Khoa học dữ liệu'],
      },
      {
        title: 'Luyện đề thi THPTQG',
        note: 'Chặng cuối, dùng chung cho cả hai định hướng.',
        items: ['Đề ôn tập & Bảng ma trận năng lực'],
      },
    ],
  },
  {
    id: 'ict',
    code: 'THUD',
    name: 'Tin học ứng dụng',
    accent: 'deep',
    stations: 10,
    focus: 'Bảng tính, thiết kế web, đồ họa và video số',
    lead: 'Dành cho bạn muốn dùng Tin học như một công cụ làm việc hằng ngày.',
    stages: [
      {
        title: 'Kiến thức chung',
        note: 'Sáu chủ đề đầu giống hệt định hướng Khoa học máy tính.',
        items: [
          'Giới thiệu Trí tuệ nhân tạo',
          'Mạng máy tính và Internet',
          'Đạo đức, pháp luật và văn hoá trong môi trường số',
          'Giới thiệu các hệ Cơ sở dữ liệu',
          'Tạo trang web với HTML và CSS',
          'Hướng nghiệp với tin học',
        ],
      },
      {
        title: 'Chuyên sâu Tin học ứng dụng',
        note: 'Ba chủ đề chỉ có ở định hướng này.',
        items: [
          'Lập trình Python cơ bản',
          'Thực hành tạo và khai thác Cơ sở dữ liệu',
          'Sử dụng phần mềm tạo trang web',
        ],
      },
      {
        title: 'Luyện đề thi THPTQG',
        note: 'Chặng cuối, dùng chung cho cả hai định hướng.',
        items: ['Đề ôn tập & Bảng ma trận năng lực'],
      },
    ],
  },
];

// ── Kho đề thi: những gì thật sự có trong tab "Kho đề thi" ──────────────────
// Nguồn: src/lib/examDocsStorage.js (DOC_TYPES, ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES)
// và src/components/ExamRepoTab.jsx (tìm kiếm, xem trước, tải về).
export const EXAM_BANK = {
  types: [
    {
      id: 'chung',
      label: 'Chung',
      detail: 'Tài liệu dùng chung cho mọi môn và mọi khối thi.',
    },
    {
      id: 'deso',
      label: 'Đề sở',
      detail: 'Đề thi của trường (đề sở) theo từng năm học.',
    },
  ],
  formats: ['PDF', 'DOC', 'DOCX', 'XLSX', 'PNG', 'JPG'],
  limit: '20 MB',
  actions: ['Xem trước ngay trên trình duyệt', 'Tải về máy', 'Tìm theo tên tài liệu'],
  // Tên tệp mẫu để thấy kho ở độ dày thật; nội dung thật nằm trong Supabase.
  sample: [
    { name: 'Đề tham khảo 2025 · Tin học', type: 'Chung', meta: 'PDF' },
    { name: 'Đề sở Hà Nội 2025 · KHMT', type: 'Đề sở', meta: 'PDF' },
    { name: 'Ma trận đề thi THPTQG 2025', type: 'Chung', meta: 'XLSX' },
    { name: 'Đề sở TP.HCM 2024 · THUD', type: 'Đề sở', meta: 'DOCX' },
  ],
};

// ── Tạo đề ngẫu nhiên & chấm phân hoá ──────────────────────────────────────
// Cấu trúc 24 câu trắc nghiệm + 4 câu Đúng/Sai trong 50 phút, lấy từ EXAM_PARTS
// ở trên. Các bước sinh đề lấy từ generationStepsText trong
// src/components/AiExamTab.jsx.
export const AI_EXAM = {
  steps: [
    'Đọc ma trận đề tốt nghiệp THPT của Bộ GD&ĐT.',
    'Chọn câu hỏi theo chủ đề và định hướng bạn đã chọn.',
    'Dựng bốn ý a, b, c, d cho từng câu Đúng/Sai.',
    'Chấm lũy tiến từng ý và viết nhận xét cho từng câu.',
  ],
  outputs: [
    { value: '24 câu', label: 'trắc nghiệm' },
    { value: '4 câu', label: 'đúng sai' },
    { value: '50 phút', label: 'một lượt làm bài' },
    { value: '0,1 → 1,0', label: 'điểm một câu Đúng/Sai' },
  ],
};

// ── Câu hỏi thật, trích từ ngân hàng đề Chủ đề 1 ────────────────────────────
export const SAMPLE_QUESTION = {
  station: 'Chủ đề 1 · Giới thiệu Trí tuệ nhân tạo',
  index: 4,
  total: 20,
  prompt: 'Phát biểu nào dưới đây mô tả chính xác nhất về Trí tuệ nhân tạo hẹp (ANI)?',
  options: [
    'Có khả năng tự chuyển đổi linh hoạt để giải quyết mọi nhiệm vụ khác nhau như con người.',
    'Có khả năng cảm nhận cảm xúc và bày tỏ sự thấu hiểu tâm lý con người.',
    'Được thiết kế để giải quyết nhiệm vụ cụ thể theo những gì đã được huấn luyện.',
    'Hoạt động hoàn toàn không cần dữ liệu đầu vào từ con người.',
  ],
  answer: 2,
  explanation:
    'AI hẹp được xây dựng để thực hiện một hoặc một số nhiệm vụ cụ thể trong phạm vi đã được huấn luyện, như chơi cờ, nhận diện khuôn mặt hay lọc thư rác.',
};

// ── Những gì có thật trong sản phẩm, dùng cho dải tính năng ─────────────────
// Kho đề thi và Tạo đề bằng AI đã có mục riêng ngay trên, nên ở đây chỉ giữ hai
// chức năng còn lại: một chức năng không được quảng bá hai lần trên cùng trang.
export const CAPABILITIES = [
  {
    id: 'route',
    name: 'Lộ trình 12 tuần',
    detail: 'Ba giai đoạn, mục tiêu điểm rõ ràng, đánh dấu tiến độ từng trạm.',
  },
  {
    id: 'streak',
    name: 'Chuỗi ngày học',
    detail: 'Điểm danh mỗi ngày, giữ nhịp học đều thay vì dồn vào tuần cuối.',
  },
];
