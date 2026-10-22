<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Database\Factories\PayoutFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model Payout — pengajuan pencairan honor mitra.
 *
 * @property int $id
 * @property string $kode
 * @property int $mitra_id
 * @property numeric-string $jumlah
 * @property string $bank_tujuan
 * @property string $no_rekening
 * @property string $nama_pemilik
 * @property PayoutStatus $status
 * @property Carbon|null $requested_at
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $paid_at
 * @property string|null $rejection_reason
 * @property string|null $catatan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read User|null $mitra
 * @property-read User|null $reviewer
 *
 * @use HasFactory<PayoutFactory>
 */
class Payout extends Model
{
    /** @use HasFactory<PayoutFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'kode',
        'mitra_id',
        'jumlah',
        'bank_tujuan',
        'no_rekening',
        'nama_pemilik',
        'status',
        'requested_at',
        'reviewed_by',
        'reviewed_at',
        'paid_at',
        'rejection_reason',
        'catatan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PayoutStatus::class,
            'jumlah' => 'decimal:2',
            'requested_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

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
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<Payout>  $query
     * @return Builder<Payout>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', PayoutStatus::PENDING->value);
    }

    /**
     * @param  Builder<Payout>  $query
     * @return Builder<Payout>
     */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', PayoutStatus::APPROVED->value);
    }

    /**
     * @param  Builder<Payout>  $query
     * @return Builder<Payout>
     */
    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', PayoutStatus::PAID->value);
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function jumlahRupiah(): string
    {
        return 'Rp '.number_format((float) $this->jumlah, 0, ',', '.');
    }
}
