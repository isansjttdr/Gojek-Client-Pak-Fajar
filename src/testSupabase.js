import { supabase } from './supabaseClient.js';

async function testConnection() {
  // Coba ambil data dari tabel contoh, misal 'users'
  const { data, error } = await supabase.from('locations').select('*').limit(1);

  if (error) {
    console.log('❌ Koneksi gagal:', error.message);
  } else {
    console.log('✅ Koneksi berhasil! Data contoh:', data);
  }
}

testConnection();
