<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Buat Akun Admin
        User::updateOrCreate(
            ['email' => 'admin@titiktemu.test'], // Cek berdasarkan email agar tidak duplikat jika dijalankan ulang
            [
                'name' => 'Administrator Utama',
                'username' => 'admin',
                'password' => Hash::make('password123'), // Password default
                'role' => 'admin',
            ]
        );

        // 2. Buat Akun Mitra
        User::updateOrCreate(
            ['email' => 'mitra@titiktemu.test'],
            [
                'name' => 'Mitra Kolaborasi',
                'username' => 'mitra',
                'password' => Hash::make('password123'),
                'role' => 'mitra',
            ]
        );

        // 3. Buat Akun Client Contoh (Opsional)
        User::updateOrCreate(
            ['email' => 'client@titiktemu.test'],
            [
                'name' => 'Budi Client',
                'username' => 'budiclient',
                'password' => Hash::make('password123'),
                'role' => 'client',
            ]
        );
    }
}
