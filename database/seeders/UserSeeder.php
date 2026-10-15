<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultPassword = 'password123';

        // ==========================================
        // 1. ADMIN UTAMA
        // ==========================================
        $admin = User::updateOrCreate(
            ['email' => 'admin@titiktemu.test'],
            [
                'name' => 'Administrator Utama',
                'username' => 'admin',
                'password' => $defaultPassword,
                'role' => 'admin',
                'must_change_password' => false, // seeder: tidak wajib ganti
            ]
        );

        Profile::updateOrCreate(
            ['user_id' => $admin->id],
            [
                'tipe' => 'admin',
                'nama_penyedia_usaha' => null,
                'meta' => [],
            ]
        );

        // ==========================================
        // 2. MITRA PERUSAHAAN
        // ==========================================
        $mitraPerusahaan = User::updateOrCreate(
            ['email' => 'budi@ptabc.com'],
            [
                'name' => 'Budi Santoso',
                'username' => 'ptabc',
                'password' => $defaultPassword,
                'role' => 'mitra',
                'must_change_password' => false,
            ]
        );

        Profile::updateOrCreate(
            ['user_id' => $mitraPerusahaan->id],
            [
                'tipe' => 'mitra',
                'nama_penyedia_usaha' => 'PT ABC Travel',
                'nomor_identitas' => '12.345.678.9-012.000',
                'alamat' => 'Jl. Merdeka No. 123',
                'telepon' => '+62 811 2233 4455',
                'provinsi' => 'Kalimantan Selatan',
                'kota' => 'Banjarmasin',
                'kode_pos' => '70111',
                'deskripsi' => 'Travel agent terpercaya sejak 2010. Melayani paket wisata domestik & internasional.',
                'meta' => [],
            ]
        );

        // ==========================================
        // 3. MITRA PERORANGAN
        // ==========================================
        $mitraPerorangan = User::updateOrCreate(
            ['email' => 'ani@gmail.com'],
            [
                'name' => 'Ani Wijaya',
                'username' => 'aniwijaya',
                'password' => $defaultPassword,
                'role' => 'mitra',
                'must_change_password' => false,
            ]
        );

        Profile::updateOrCreate(
            ['user_id' => $mitraPerorangan->id],
            [
                'tipe' => 'mitra',
                'nama_penyedia_usaha' => null, // fallback ke user.name
                'nomor_identitas' => '1234567890123456',
                'alamat' => 'Jl. Sunset Road No. 45',
                'telepon' => '+62 812 3456 7890',
                'provinsi' => 'Bali',
                'kota' => 'Denpasar',
                'kode_pos' => '80119',
                'deskripsi' => 'Tour guide freelance spesialis Bali & Nusa Tenggara.',
                'meta' => [],
            ]
        );

        // ==========================================
        // 4. CLIENT
        // ==========================================
        $client = User::updateOrCreate(
            ['email' => 'client@titiktemu.test'],
            [
                'name' => 'Budi Client',
                'username' => 'budiclient',
                'password' => $defaultPassword,
                'role' => 'client',
                'must_change_password' => false,
            ]
        );

        Profile::updateOrCreate(
            ['user_id' => $client->id],
            [
                'tipe' => 'client',
                'meta' => [],
            ]
        );

        // ==========================================
        // LOG
        // ==========================================
        $this->command->info('✅ Seeder selesai:');
        $this->command->info('   Admin  : admin@titiktemu.test / password123');
        $this->command->info('   Mitra 1: budi@ptabc.com / password123 (PT ABC Travel)');
        $this->command->info('   Mitra 2: ani@gmail.com / password123 (Ani Wijaya)');
        $this->command->info('   Client : client@titiktemu.test / password123');
    }
}
