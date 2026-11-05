import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Check, Clock3, Copy, RefreshCw, Users } from 'lucide-react';
import { fetchTodayActivityLogs, summarizeActivityLogs, USER_ACTIVITY_BUCKET,
  USER_ACTIVITY_FOLDER, USER_ACTIVITY_SQL } from '../lib/userActivityStorage.js';

function duration(seconds) {
  const minutes = Math.floor((Number(seconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} giờ ${minutes % 60} phút` : `${minutes} phút`;
}

export default function AdminUserActivityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchTodayActivityLogs();
    setLogs(result.logs);
    setError(result.error || '');
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const summary = useMemo(() => summarizeActivityLogs(logs), [logs]);
  const copySql = async () => {
    await navigator.clipboard.writeText(USER_ACTIVITY_SQL);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>Người dùng hoạt động hôm nay</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '.78rem' }}>
            Chỉ tính thời gian tab đang mở và có tương tác trong 2 phút gần nhất.</p></div>
        <button type="button" onClick={load} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          minHeight: 38, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />Làm mới</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, margin: '1rem 0' }}>
        {[[Users, 'Người dùng', summary.uniqueUsers], [Activity, 'Vừa online', summary.onlineUsers],
          [Clock3, 'Thời gian chủ động', duration(summary.activeSeconds)]].map(([Icon, label, value]) => (
          <div key={label} style={{ padding: 12, borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#9a3412', fontSize: '.72rem' }}><Icon size={14} />{label}</span>
            <strong style={{ display: 'block', marginTop: 6, fontSize: '1.05rem' }}>{value}</strong>
          </div>))}
      </div>
      {error && <div role="alert" style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: '.8rem' }}>{error}</div>}
      {error && <button type="button" onClick={copySql} style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
        marginTop: 10, minHeight: 38, padding: '0 12px', border: 0, borderRadius: 8, background: '#ea580c', color: '#fff', cursor: 'pointer' }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Đã sao chép SQL' : 'Sao chép SQL tạo bucket & policy'}</button>}
      {!loading && !error && summary.users.length === 0 && <p style={{ color: '#6b7280', fontSize: '.82rem' }}>Chưa có log hôm nay.</p>}
      {summary.users.length > 0 && <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
        <thead><tr>{['User ID', 'Chủ động', 'Phiên', 'Lần cuối', 'Trang cuối'].map((value) => <th key={value} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>{value}</th>)}</tr></thead>
        <tbody>{summary.users.map((row) => <tr key={row.userId}><td style={{ padding: 8, fontFamily: 'monospace' }}>{row.userId}</td>
          <td style={{ padding: 8 }}>{duration(row.activeSeconds)}</td><td style={{ padding: 8 }}>{row.sessions}</td>
          <td style={{ padding: 8 }}>{new Date(row.lastSeenAt).toLocaleTimeString('vi-VN')}</td><td style={{ padding: 8 }}>{row.lastPath}</td></tr>)}</tbody>
      </table></div>}
      <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: '.7rem' }}>
        Storage: {USER_ACTIVITY_BUCKET}/{USER_ACTIVITY_FOLDER}/[user-id]/[ngày]/usage.json</p>
    </section>
  );
}
