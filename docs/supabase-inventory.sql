-- Kiểm kê metadata trước khi dọn Supabase; không sửa/xóa dữ liệu hay schema.
-- Không xuất dữ liệu học viên, nội dung function hay câu lệnh cron có thể chứa secret.
-- Không kết luận một đối tượng vô dụng chỉ vì chưa tìm thấy trong code/thống kê.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

-- 1. Dung lượng tổng và thời điểm bắt đầu thống kê.
SELECT current_database() AS database_name,
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  d.stats_reset,
  current_setting('track_functions') AS function_tracking
FROM pg_stat_database d WHERE d.datname = current_database();

-- 2. Bảng của ứng dụng: số dòng ước tính, dung lượng, RLS, vacuum/analyze.
SELECT c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_indexes_size(c.oid)) AS indexes_size,
  s.n_live_tup AS estimated_live_rows,
  s.n_dead_tup AS estimated_dead_rows,
  c.relrowsecurity AS rls_enabled,
  s.last_autovacuum, s.last_autoanalyze
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY pg_total_relation_size(c.oid) DESC;

-- 3. Index: cần giữ nguyên index phục vụ constraint dù idx_scan = 0.
-- idx_scan phụ thuộc khoảng thời gian thu thập, không tự động đồng nghĩa không cần.
SELECT s.relname AS table_name, s.indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
  s.idx_scan, i.indisprimary AS is_primary, i.indisunique AS is_unique,
  i.indisvalid AS is_valid, con.conname AS backing_constraint
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
LEFT JOIN pg_constraint con ON con.conindid = s.indexrelid
WHERE s.schemaname = 'public'
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- 4. Function/procedure: chỉ metadata; không xuất thân hàm hay giá trị mặc định.
SELECT p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prokind AS routine_kind, p.prosecdef AS security_definer,
  l.lanname AS language, s.calls, s.total_time
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
LEFT JOIN pg_stat_user_functions s ON s.funcid = p.oid
WHERE n.nspname = 'public'
ORDER BY p.proname, arguments;

-- 5. Policy đang tồn tại; không mở RLS hay thay quyền truy cập.
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- 6. Trigger và hàm được gọi: trigger Auth có thể không xuất hiện trong code JS.
SELECT n.nspname AS schema_name, c.relname AS table_name,
  t.tgname AS trigger_name, t.tgenabled AS enabled,
  pn.nspname AS function_schema, p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, c.relname, t.tgname;

-- 7. Dependency khai báo của function public; không bao phủ mọi lời gọi động/PLpgSQL.
SELECT p.proname AS referenced_function,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
  d.deptype AS dependency_type
FROM pg_depend d
JOIN pg_proc p ON d.refclassid = 'pg_proc'::regclass AND d.refobjid = p.oid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname, dependent_object;

-- 8. Extension, nhất là pg_cron/pg_stat_statements; không kích hoạt extension mới.
SELECT e.extname, e.extversion, n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

COMMIT;

-- Đối chiếu bắt buộc theo code MewTinHoc hiện tại:
-- Bảng: profiles, user_progress, mastery_progress, roadmap_lessons,
--       daily_checkins, announcements.
-- Function: get_exp_leaderboard, is_admin_user, handle_new_user.
-- Trigger: on_auth_user_created (hàm handle_new_user).
-- Bucket: KhoTaiLieuTinHocThiThu, user-activity-logs.
-- Các đối tượng không nằm trong danh sách trên vẫn cần kiểm tra dependency,
-- cron, ứng dụng khác và lịch sử dùng trước khi đưa vào kế hoạch dọn.
