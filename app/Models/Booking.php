<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Support\Timezone;
use Carbon\CarbonImmutable;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Model Booking — pesanan client untuk sebuah paket wisata.
 *
 * Relasi:
 * - belongsTo Package
 * - belongsTo User (client, via user_id)
 * - hasMany BookingParticipant
 * - hasMany Payment (praktik: 1 booking = 1 payment)
 * - hasOne Trip (Fase 3)
 *
 * Cast:
 * - status → BookingStatus enum
 * - tanggal_keberangkatan → date (DATE murni, netral timezone)
 * - expired_at → datetime (UTC)
 * - total_harga → decimal:2
 *
 * @property int $id
 * @property string $kode
 * @property int $package_id
 * @property int $user_id
 * @property CarbonImmutable|null $tanggal_keberangkatan
 * @property int $jumlah_peserta
 * @property string $total_harga
 * @property BookingStatus $status
 * @property CarbonImmutable|null $expired_at
 * @property string|null $catatan
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property CarbonImmutable|null $deleted_at
 * @property-read Package|null $package
 * @property-read User|null $client
 * @property-read Collection<int, BookingParticipant> $participants
 * @property-read Collection<int, Payment> $payments
 * @property-read Trip|null $trip
 *
 * @use HasFactory<BookingFactory>
 */
class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Atribut yang dapat diisi secara massal.
     *
     * @var list<string>
     */
    protected $fillable = [
        'kode',
        'package_id',
        'user_id',
        'tanggal_keberangkatan',
        'jumlah_peserta',
        'total_harga',
        'status',
        'expired_at',
        'catatan',
    ];

    /**
     * Casting atribut.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => BookingStatus::class,
            'tanggal_keberangkatan' => 'date',
            'expired_at' => 'datetime',
            'jumlah_peserta' => 'integer',
            'total_harga' => 'decimal:2',
            'deleted_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * Paket wisata yang dipesan.
     *
     * @return BelongsTo<Package, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    /**
     * Client yang membuat booking ini.
     *
     * @return BelongsTo<User, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Daftar peserta booking.
     *
     * @return HasMany<BookingParticipant, $this>
     */
    public function participants(): HasMany
    {
        return $this->hasMany(BookingParticipant::class);
    }

    /**
     * Daftar pembayaran booking.
     *
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Trip yang dihasilkan dari booking ini (1:1).
     *
     * @return HasOne<Trip, $this>
     */
    public function trip(): HasOne
    {
        return $this->hasOne(Trip::class);
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopePendingPayment(Builder $query): Builder
    {
        return $query->where('status', BookingStatus::PENDING_PAYMENT->value);
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopePaymentVerified(Builder $query): Builder
    {
        return $query->where('status', BookingStatus::PAYMENT_VERIFIED->value);
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', BookingStatus::CONFIRMED->value);
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeAktif(Builder $query): Builder
    {
        return $query->whereNotIn('status', [
            BookingStatus::COMPLETED->value,
            BookingStatus::CANCELLED->value,
        ]);
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query
            ->where('status', BookingStatus::PENDING_PAYMENT->value)
            ->whereNotNull('expired_at')
            ->where('expired_at', '<=', now());
    }

    // ==========================================
    // HELPER — STATUS
    // ==========================================

    /**
     * Apakah booking masih bisa di-cancel oleh client?
     */
    public function canBeCancelledByClient(): bool
    {
        return $this->status->canBeCancelledByClient();
    }

    /**
     * Apakah booking sudah final (completed/cancelled)?
     */
    public function isFinal(): bool
    {
        return $this->status->isFinal();
    }

    /**
     * Apakah booking sudah lewat expired_at?
     */
    public function isExpired(): bool
    {
        if ($this->expired_at === null) {
            return false;
        }

        return $this->status === BookingStatus::PENDING_PAYMENT
            && $this->expired_at->isPast();
    }

    // ==========================================
    // HELPER — HARGA
    // ==========================================

    /**
     * Hitung total harga booking berdasarkan package & jumlah peserta.
     */
    public function calculateTotalHarga(): float
    {
        $package = $this->package;

        if ($package === null) {
            return 0.0;
        }

        if ($package->harga_per_rombongan !== null && (float) $package->harga_per_rombongan > 0) {
            return (float) $package->harga_per_rombongan;
        }

        return (float) $package->harga_per_orang * $this->jumlah_peserta;
    }

    /**
     * Format total harga sebagai string Rupiah.
     */
    public function totalHargaRupiah(): string
    {
        return 'Rp '.number_format((float) $this->total_harga, 0, ',', '.');
    }

    /**
     * Berapa lama lagi (jam) sebelum expired?
     */
    public function hoursUntilExpired(): ?int
    {
        if ($this->expired_at === null || $this->status !== BookingStatus::PENDING_PAYMENT) {
            return null;
        }

        $diff = now()->diffInHours($this->expired_at, false);

        return max(0, (int) $diff);
    }

    // ==========================================
    // HELPER — TIMEZONE
    // ==========================================

    /**
     * Ambil tanggal keberangkatan dalam format `YYYY-MM-DD`.
     *
     * `tanggal_keberangkatan` adalah DATE murni (netral timezone),
     * jadi return string apa adanya.
     */
    public function tanggalKeberangkatanLocal(): string
    {
        $value = $this->tanggal_keberangkatan;

        // Setelah cast 'date', nilai berupa CarbonImmutable.
        return $value?->format('Y-m-d') ?? '';
    }

    /**
     * Timezone acuan untuk booking ini (dari package).
     */
    public function timezone(): string
    {
        return $this->package?->timezone ?: Timezone::DEFAULT;
    }
}
