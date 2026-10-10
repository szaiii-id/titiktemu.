<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @use HasFactory<\Database\Factories\UserFactory>
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Atribut yang dapat diisi secara massal (mass assignable).
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'google_id',
        'role',
    ];

    /**
     * Atribut yang disembunyikan saat model diubah menjadi array/JSON (dikirim ke Svelte).
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Penyesuaian tipe data atribut (casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Fungsi bantuan untuk mengecek apakah user adalah Admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Fungsi bantuan untuk mengecek apakah user adalah Mitra
     */
    public function isMitra(): bool
    {
        return $this->role === 'mitra';
    }

    /**
     * Fungsi bantuan untuk mengecek apakah user adalah Client
     */
    public function isClient(): bool
    {
        return $this->role === 'client';
    }
}