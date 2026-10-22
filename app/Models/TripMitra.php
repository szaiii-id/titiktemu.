<?php

namespace App\Models;

use App\Enums\TripMitraRole;
use App\Support\TripHonorTipe;
use Database\Factories\TripMitraFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model TripMitra — pivot: mitra yang di-assign ke sebuah trip.
 *
 * @property int $id
 * @property int $trip_id
 * @property int $mitra_id
 * @property TripMitraRole $role
 * @property numeric-string $honor
 * @property string $honor_tipe
 * @property string|null $instruksi
 * @property int|null $assigned_by
 * @property Carbon|null $assigned_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Trip|null $trip
 * @property-read User|null $mitra
 * @property-read User|null $assigner
 *
 * @use HasFactory<TripMitraFactory>
 */
class TripMitra extends Model
{
    /** @use HasFactory<TripMitraFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'trip_id',
        'mitra_id',
        'role',
        'honor',
        'honor_tipe',
        'instruksi',
        'assigned_by',
        'assigned_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => TripMitraRole::class,
            'honor' => 'decimal:2',
            'assigned_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<Trip, $this>
     */
    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function mitra(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mitra_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<TripMitra>  $query
     * @return Builder<TripMitra>
     */
    public function scopeLead(Builder $query): Builder
    {
        return $query->where('role', TripMitraRole::LEAD->value);
    }

    /**
     * @param  Builder<TripMitra>  $query
     * @return Builder<TripMitra>
     */
    public function scopeAsisten(Builder $query): Builder
    {
        return $query->where('role', TripMitraRole::ASISTEN->value);
    }

    // ==========================================
    // HELPER — ROLE
    // ==========================================

    public function isLead(): bool
    {
        return $this->role === TripMitraRole::LEAD;
    }

    public function isAsisten(): bool
    {
        return $this->role === TripMitraRole::ASISTEN;
    }

    public function roleLabel(): string
    {
        return $this->role->label();
    }

    // ==========================================
    // HELPER — HONOR
    // ==========================================

    /**
     * Hitung honor total berdasarkan tipe & durasi trip.
     */
    public function hitungHonorTotal(?int $durasiHari = null): float
    {
        $honor = (float) $this->honor;

        if ($this->honor_tipe === TripHonorTipe::FLAT) {
            return $honor;
        }

        if ($this->honor_tipe === TripHonorTipe::PER_HARI) {
            $durasi = $durasiHari ?? $this->trip?->durasiHari() ?? 1;

            return $honor * $durasi;
        }

        return $honor;
    }

    public function honorTipeLabel(): string
    {
        return TripHonorTipe::label($this->honor_tipe);
    }

    public function honorRupiah(): string
    {
        return 'Rp '.number_format((float) $this->honor, 0, ',', '.');
    }

    public function honorTotalRupiah(?int $durasiHari = null): string
    {
        return 'Rp '.number_format($this->hitungHonorTotal($durasiHari), 0, ',', '.');
    }
}
