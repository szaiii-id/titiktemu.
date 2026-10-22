<?php

namespace App\Models;

use Database\Factories\DailyReportFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Model DailyReport — laporan harian mitra untuk sebuah trip_day.
 *
 * @property int $id
 * @property int $trip_day_id
 * @property int $mitra_id
 * @property string|null $catatan
 * @property string $status
 * @property Carbon|null $submitted_at
 * @property int|null $verified_by
 * @property Carbon|null $verified_at
 * @property string|null $rejection_reason
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read TripDay|null $tripDay
 * @property-read User|null $mitra
 * @property-read User|null $verifier
 * @property-read Collection<int, DailyReportMedia> $media
 *
 * @use HasFactory<DailyReportFactory>
 */
class DailyReport extends Model
{
    /** @use HasFactory<DailyReportFactory> */
    use HasFactory;

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_REJECTED = 'rejected';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'trip_day_id',
        'mitra_id',
        'catatan',
        'status',
        'submitted_at',
        'verified_by',
        'verified_at',
        'rejection_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<TripDay, $this>
     */
    public function tripDay(): BelongsTo
    {
        return $this->belongsTo(TripDay::class);
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
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * @return HasMany<DailyReportMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(DailyReportMedia::class)->orderBy('urutan');
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<DailyReport>  $query
     * @return Builder<DailyReport>
     */
    public function scopeSubmitted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_SUBMITTED);
    }

    /**
     * @param  Builder<DailyReport>  $query
     * @return Builder<DailyReport>
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_VERIFIED);
    }

    /**
     * @param  Builder<DailyReport>  $query
     * @return Builder<DailyReport>
     */
    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    // ==========================================
    // HELPER — STATUS
    // ==========================================

    public function isSubmitted(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function isVerified(): bool
    {
        return $this->status === self::STATUS_VERIFIED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            self::STATUS_SUBMITTED => 'Menunggu Verifikasi',
            self::STATUS_VERIFIED => 'Terverifikasi',
            self::STATUS_REJECTED => 'Ditolak',
            default => ucfirst($this->status),
        };
    }

    public function statusBadgeClass(): string
    {
        return match ($this->status) {
            self::STATUS_SUBMITTED => 'bg-sun/10 text-sun-dark border border-sun/20',
            self::STATUS_VERIFIED => 'bg-green/10 text-green-dark border border-green/20',
            self::STATUS_REJECTED => 'bg-red-50 text-red-700 border border-red-200',
            default => 'bg-gray-100 text-gray-700 border border-gray-200',
        };
    }

    // ==========================================
    // HELPER — MEDIA
    // ==========================================

    public function hasMedia(): bool
    {
        return $this->media()->exists();
    }

    public function mediaCount(): int
    {
        return $this->media()->count();
    }

    public function firstMediaUrl(): ?string
    {
        $first = $this->media()->first();

        return $first ? asset('storage/'.$first->path) : null;
    }
}
