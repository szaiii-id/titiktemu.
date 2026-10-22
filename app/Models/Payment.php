<?php

namespace App\Models;

use App\Enums\PaymentMetode;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model Payment — bukti pembayaran manual dari client.
 *
 * @property int $id
 * @property int $booking_id
 * @property numeric-string $jumlah
 * @property PaymentMetode $metode
 * @property string|null $bank_pengirim
 * @property string|null $nama_pengirim
 * @property string|null $bukti_transfer
 * @property int|null $verified_by
 * @property Carbon|null $verified_at
 * @property string|null $catatan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Booking|null $booking
 * @property-read User|null $verifier
 *
 * @use HasFactory<PaymentFactory>
 */
class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'booking_id',
        'jumlah',
        'metode',
        'bank_pengirim',
        'nama_pengirim',
        'bukti_transfer',
        'verified_by',
        'verified_at',
        'catatan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metode' => PaymentMetode::class,
            'jumlah' => 'decimal:2',
            'verified_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<Payment>  $query
     * @return Builder<Payment>
     */
    public function scopeBelumDiverifikasi(Builder $query): Builder
    {
        return $query->whereNull('verified_at');
    }

    /**
     * @param  Builder<Payment>  $query
     * @return Builder<Payment>
     */
    public function scopeSudahDiverifikasi(Builder $query): Builder
    {
        return $query->whereNotNull('verified_at');
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function hasBuktiTransfer(): bool
    {
        return ! empty($this->bukti_transfer);
    }

    public function jumlahRupiah(): string
    {
        return 'Rp '.number_format((float) $this->jumlah, 0, ',', '.');
    }

    public function buktiTransferUrl(): ?string
    {
        if ($this->bukti_transfer === null || $this->bukti_transfer === '') {
            return null;
        }

        return asset('storage/'.$this->bukti_transfer);
    }

    /**
     * Label metode pembayaran (Bahasa Indonesia).
     */
    public function metodeLabel(): string
    {
        return $this->metode->label();
    }
}
