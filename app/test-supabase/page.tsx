'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestSupabasePage() {
  const [status, setStatus] = useState('Checking connection...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('test').select('*').limit(1);
        if (error) throw error;
        setStatus('✅ Supabase connection successful!');
      } catch (err) {
        console.error(err);
        setStatus('❌ Supabase connection failed. Check console or .env.local');
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Supabase Connection Test</h1>
      <p>{status}</p>
    </div>
  );
}
