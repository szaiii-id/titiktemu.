<?php

namespace App\Repositories\Eloquent;

use App\Models\Profile;
use App\Models\User;
use App\Repositories\Contracts\ProfileRepositoryInterface;

class ProfileRepository implements ProfileRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function createForUser(User $user, array $data): Profile
    {
        return Profile::create([
            'user_id' => $user->id,
            'tipe' => $data['tipe'] ?? $user->role,
            'nama_penyedia_usaha' => $data['nama_penyedia_usaha'] ?? null,
            'nomor_identitas' => $data['nomor_identitas'] ?? null,
            'alamat' => $data['alamat'] ?? null,
            'telepon' => $data['telepon'] ?? null,
            'provinsi' => $data['provinsi'] ?? null,
            'kota' => $data['kota'] ?? null,
            'kode_pos' => $data['kode_pos'] ?? null,
            'logo' => $data['logo'] ?? null,
            'deskripsi' => $data['deskripsi'] ?? null,
            'meta' => $data['meta'] ?? [],
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function updateProfile(Profile $profile, array $data): Profile
    {
        $profile->update($data);

        return $profile->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function findByUserId(int $userId): ?Profile
    {
        return Profile::where('user_id', $userId)->first();
    }
}
