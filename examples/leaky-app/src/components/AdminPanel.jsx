'use client';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
);

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    admin.from('profiles').select('*').then(({ data }) => setUsers(data ?? []));
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.username}</li>)}</ul>;
}
