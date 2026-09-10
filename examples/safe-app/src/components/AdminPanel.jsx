'use client';
import { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers);
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.username}</li>)}</ul>;
}
