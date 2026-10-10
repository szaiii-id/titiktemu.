<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class UserRepository implements UserRepositoryInterface
{
    public function findByEmailOrUsername(string $identitas)
    {
        return User::where('email', $identitas)
                   ->orWhere('username', $identitas)
                   ->first();
    }

    public function findByGoogleId(string $googleId)
    {
        return User::where('google_id', $googleId)->first();
    }

    public function findByEmail(string $email)
    {
        return User::where('email', $email)->first();
    }

    public function createClient(array $data)
    {
        return User::create([
            'name'      => $data['name'],
            'username'  => $data['username'] ?? null,
            'email'     => $data['email'],
            'password'  => isset($data['password']) ? bcrypt($data['password']) : null,
            'google_id' => $data['google_id'] ?? null,
            'role'      => 'client', // Otomatis dikunci sebagai client demi keamanan
        ]);
    }
}