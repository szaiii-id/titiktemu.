<?php

namespace App\Repositories\Contracts;

interface UserRepositoryInterface
{
    /**
     * Mencari user berdasarkan Email atau Username (untuk form login manual)
     */
    public function findByEmailOrUsername(string $identitas);

    /**
     * Mencari user berdasarkan Google ID (untuk fitur Login with Google)
     */
    public function findByGoogleId(string $googleId);

    /**
     * Mencari user berdasarkan Email (berguna saat validasi register atau fallback SSO)
     */
    public function findByEmail(string $email);

    /**
     * Membuat akun baru khusus dengan role 'client'
     */
    public function createClient(array $data);
}