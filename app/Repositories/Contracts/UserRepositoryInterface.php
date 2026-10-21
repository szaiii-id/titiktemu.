<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

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
     * Mencari user berdasarkan ID.
     */
    public function findById(int $id): ?User;

    /**
     * Membuat akun baru khusus dengan role 'client'.
     *
     * @param  array<string, mixed>  $data
     */
    public function createClient(array $data): User;

    /**
     * Membuat akun baru dengan role bebas (admin / mitra).
     *
     * @param  array<string, mixed>  $data
     */
    public function createUser(array $data): User;

    /**
     * Update data user.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateUser(User $user, array $data): User;

    /**
     * Update password user (untuk ganti / reset password).
     *
     * @param  string  $plainPassword  Password dalam bentuk plain text.
     */
    public function updatePassword(User $user, string $plainPassword): User;

    /**
     * Hapus user (soft delete via kolom atau hard delete — sesuai keputusan).
     */
    public function deleteUser(User $user): bool;

    /**
     * Ambil daftar user berdasarkan role tertentu (untuk admin & mitra).
     *
     * @param  array<int, string>  $roles
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateByRoles(
        array $roles,
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator;

    /**
     * Ambil daftar client (read-only untuk admin).
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateClients(
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator;

    /**
     * Cek apakah email sudah dipakai.
     */
    public function emailExists(string $email, ?int $exceptUserId = null): bool;

    /**
     * Cek apakah username sudah dipakai.
     */
    public function usernameExists(string $username, ?int $exceptUserId = null): bool;

    /**
     * Cari user berdasarkan role (untuk autocomplete).
     *
     * @param  string  $role  Role yang dicari (misal: 'mitra').
     * @param  string  $search  Kata kunci (nama, email, username).
     * @param  int  $limit  Jumlah maksimal hasil.
     * @return Collection<int, User>
     */
    public function searchByRole(string $role, string $search, int $limit = 10): Collection;
}
