<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @use HasFactory<UserFactory>
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Timezone default kalau user belum set.
     */
    public const DEFAULT_TIMEZONE = 'Asia/Makassar';

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
        'timezone',
        'must_change_password',
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
            'must_change_password' => 'boolean',
        ];
    }

    // ==========================================
    // ROLE CHECKS
    // ==========================================

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isMitra(): bool
    {
        return $this->role === 'mitra';
    }

    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    public function timezoneOrDefault(): string
    {
        return $this->timezone ?: self::DEFAULT_TIMEZONE;
    }

    // ==========================================
    // RELASI — USER / CLIENT
    // ==========================================

    /**
     * Relasi ke profile (1 user = 1 profile).
     *
     * @return HasOne<Profile, $this>
     */
    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    /**
     * Booking yang dibuat oleh user ini (sebagai client).
     *
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'user_id');
    }

    // ==========================================
    // RELASI — MITRA
    // ==========================================

    /**
     * Trip yang di-assign ke mitra ini (pivot trip_mitras).
     *
     * @return HasMany<TripMitra, $this>
     */
    public function tripMitras(): HasMany
    {
        return $this->hasMany(TripMitra::class, 'mitra_id');
    }

    /**
     * Trip yang di-assign ke mitra ini via pivot.
     *
     * @return BelongsToMany<Trip, $this>
     */
    public function trips(): BelongsToMany
    {
        return $this->belongsToMany(Trip::class, 'trip_mitras', 'mitra_id', 'trip_id')
            ->withPivot(['role', 'honor', 'honor_tipe', 'instruksi', 'assigned_by', 'assigned_at'])
            ->withTimestamps();
    }

    /**
     * Laporan harian yang dibuat oleh mitra ini.
     *
     * @return HasMany<DailyReport, $this>
     */
    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class, 'mitra_id');
    }

    /**
     * Wallet mitra (saldo, pencairan).
     *
     * @return HasOne<MitraWallet, $this>
     */
    public function mitraWallet(): HasOne
    {
        return $this->hasOne(MitraWallet::class, 'mitra_id');
    }

    /**
     * Histori payout (pencairan dana) mitra.
     *
     * @return HasMany<Payout, $this>
     */
    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class, 'mitra_id');
    }
}
