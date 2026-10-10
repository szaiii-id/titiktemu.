<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface UserRepositoryInterface
{
    /**
     * Mencari user berdasarkan Email atau Username (untuk form login manual).
     */
    public function findByEmailOrUsername(string $identitas): ?User;

    /**
     * Mencari user berdasarkan Google ID (untuk fitur Login with Google).
     */
    public function findByGoogleId(string $googleId): ?User;

    /**
     * Mencari user berdasarkan Email (berguna saat validasi register atau fallback SSO).
     */
    public function findByEmail(string $email): ?User;

    /**
     * Membuat akun baru khusus dengan role 'client'.
     *
     * @param  array<string, mixed>  $data
     */
    public function createClient(array $data): User;
}