// Tipe data untuk Customer (sesuai dengan kolom Supabase Anda)
export interface Customer {
  id: string; // ID dari auth.users
  nim: string;
  nama: string;
  email: string;
  nomor_telepon: string;
  created_at?: string;
}

// Tipe data untuk Form Login
export interface LoginFormState {
  nim: string;
  password: string;
}

// Tipe data untuk Form Register
export interface RegisterFormState extends LoginFormState {
  nama: string;
  email: string;
  nomorTelepon: string;
  jenisMotor: string;
  nomorPlat: string;
  role: 'customer' | 'driver';
}
