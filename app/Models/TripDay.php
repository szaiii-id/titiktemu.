<?php

namespace App\Models;

use App\Support\Timezone;
use Database\Factories\TripDayFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Model TripDay — itinerary per hari untuk sebuah trip.
 *
 * @property int $id
 * @property int $trip_id
 * @property int $hari_ke
 * @property Carbon $tanggal
 * @property string $judul
 * @property string|null $deskripsi
 * @property string $status
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Trip|null $trip
 * @property-read Collection<int, DailyReport> $dailyReports
 *
 * @use HasFactory<TripDayFactory>
 */
class TripDay extends Model
{
    /** @use HasFactory<TripDayFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'trip_id',
        'hari_ke',
        'tanggal',
        'judul',
        'deskripsi',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hari_ke' => 'integer',
            'tanggal' => 'date',
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
     * @return HasMany<DailyReport, $this>
     */
    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<TripDay>  $query
     * @return Builder<TripDay>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * @param  Builder<TripDay>  $query
     * @return Builder<TripDay>
     */
    public function scopeInProgress(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    /**
     * @param  Builder<TripDay>  $query
     * @return Builder<TripDay>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    // ==========================================
    // HELPER — STATUS
    // ==========================================

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING => 'Belum Dimulai',
            self::STATUS_IN_PROGRESS => 'Sedang Berjalan',
            self::STATUS_COMPLETED => 'Selesai',
            default => ucfirst($this->status),
        };
    }

    public function statusBadgeClass(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING => 'bg-gray-100 text-gray-700 border border-gray-200',
            self::STATUS_IN_PROGRESS => 'bg-purple/10 text-purple-dark border border-purple/20',
            self::STATUS_COMPLETED => 'bg-green/10 text-green-dark border border-green/20',
            default => 'bg-gray-100 text-gray-700 border border-gray-200',
        };
    }

    // ==========================================
    // HELPER — TANGGAL
    // ==========================================

    /**
     * Apakah hari ini adalah "hari ini" berdasarkan timezone trip?
     */
    public function isToday(): bool
    {
        $tripTz = $this->trip?->timezoneOrDefault() ?? Timezone::DEFAULT;
        $today = Timezone::today($tripTz);

        return $this->tanggal->isSameDay($today);
    }

    /**
     * Apakah hari ini sudah lewat (berdasarkan timezone trip)?
     */
    public function isPast(): bool
    {
        $tripTz = $this->trip?->timezoneOrDefault() ?? Timezone::DEFAULT;
        $today = Timezone::today($tripTz);

        return $this->tanggal->lessThan($today);
    }

    /**
     * Apakah hari ini akan datang (berdasarkan timezone trip)?
     */
    public function isFuture(): bool
    {
        $tripTz = $this->trip?->timezoneOrDefault() ?? Timezone::DEFAULT;
        $today = Timezone::today($tripTz);

        return $this->tanggal->greaterThan($today);
    }

    // ==========================================
    // HELPER — SNAPSHOT
    // ==========================================

    /**
     * @return array<string, mixed>|null
     */
    public function snapshotDay(): ?array
    {
        $trip = $this->trip;

        if ($trip === null) {
            return null;
        }

        $days = $trip->snapshotDays();

        foreach ($days as $day) {
            if ((int) ($day['hari_ke'] ?? 0) === $this->hari_ke) {
                return $day;
            }
        }

        return null;
    }

    public function jamMulai(): ?string
    {
        $day = $this->snapshotDay();

        if ($day === null || ! isset($day['jam_mulai'])) {
            return null;
        }

        return (string) $day['jam_mulai'];
    }

    public function jamSelesai(): ?string
    {
        $day = $this->snapshotDay();

        if ($day === null || ! isset($day['jam_selesai'])) {
            return null;
        }

        return (string) $day['jam_selesai'];
    }

    public function lokasi(): ?string
    {
        $day = $this->snapshotDay();

        if ($day === null || ! isset($day['lokasi'])) {
            return null;
        }

        return (string) $day['lokasi'];
    }

    // ==========================================
    // HELPER — DAILY REPORTS (Fase 4)
    // ==========================================

    /**
     * Apakah hari ini punya minimal 1 daily report?
     */
    public function hasDailyReports(): bool
    {
        return $this->dailyReports()->exists();
    }

    /**
     * Apakah ada daily report yang sudah verified untuk hari ini?
     */
    public function hasVerifiedReport(): bool
    {
        return $this->dailyReports()
            ->where('status', DailyReport::STATUS_VERIFIED)
            ->exists();
    }

    /**
     * Apakah semua report di hari ini sudah verified?
     */
    public function allReportsVerified(): bool
    {
        $reports = $this->dailyReports;

        if ($reports->isEmpty()) {
            return false;
        }

        return $reports->every(fn (DailyReport $report): bool => $report->isVerified());
    }
}
