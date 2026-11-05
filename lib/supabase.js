import { createClient } from '@supabase/supabase-js';

// Vite chỉ nhúng các biến VITE_* vào bundle. Nếu .env.local còn giá trị mẫu
// (YOUR_PROJECT_ID / YOUR_PUBLISHABLE_KEY) thì phải bỏ qua, nếu không client
// sẽ trỏ tới một domain không tồn tại và mọi request auth/DB đều hỏng.
const rawUrl = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const rawKey = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined;

function isUsable(value, markers) {
    if (!value) return false;
    const text = String(value).trim();
    if (!text) return false;
    if (/^(?:your[_-]|<|\$your|changeme|todo|xxx)/i.test(text)) return false;
    return !markers.some((marker) => text.includes(marker));
}

const supabaseUrl = isUsable(rawUrl, ['YOUR_PROJECT_ID'])
    ? String(rawUrl).trim()
    : 'https://vxqvjffssebnuxtslghp.supabase.co';

const supabaseKey = isUsable(rawKey, ['YOUR_PUBLISHABLE_KEY'])
    ? String(rawKey).trim()
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cXZqZmZzc2VibnV4dHNsZ2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MDk5NjgsImV4cCI6MjEwNzM4NTk2OH0.KZUQnisFgnoo_ZHUk7Wn9LfbLAzuzSztwYRLh1VHp6U';

export const supabase = createClient(supabaseUrl, supabaseKey);
