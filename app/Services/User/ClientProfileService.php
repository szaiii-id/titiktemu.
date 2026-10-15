<?php

namespace App\Services\User;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;

class ClientProfileService
{
    public function __construct(
        protected UserRepositoryInterface $userRepository,
    ) {}

    /**
     * Ambil data profile client untuk ditampilkan di FE.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     username: string|null,
     *     email: string,
     *     role: string,
     * }
     */
    public function getProfileData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }

    /**
     * Update profile client.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProfile(User $user, array $data): User
    {
        $user = $this->userRepository->updateUser($user, [
            'name' => $data['name'],
            'username' => $data['username'] ?? null,
        ]);

        Log::info('Client update profile', [
            'user_id' => $user->id,
        ]);

        return $user;
    }
}
