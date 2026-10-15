<?php

namespace App\Repositories\Contracts;

use App\Models\Profile;
use App\Models\User;

interface ProfileRepositoryInterface
{
    /**
     * Buat profile baru untuk user.
     *
     * @param  array<string, mixed>  $data
     */
    public function createForUser(User $user, array $data): Profile;

    /**
     * Update data profile.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProfile(Profile $profile, array $data): Profile;

    /**
     * Cari profile berdasarkan user_id.
     */
    public function findByUserId(int $userId): ?Profile;
}
