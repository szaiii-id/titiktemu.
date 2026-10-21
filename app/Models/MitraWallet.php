<?php

namespace App\Models;

use Database\Factories\MitraWalletFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Model MitraWallet — wallet digital untuk saldo honor mitra.
 *
 * @property int $id
 * @property int $mitra_id
 * @property numeric-string $saldo
 * @property numeric-string $total_pendapatan
 * @property numeric-string $total_dicairkan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read User|null $mitra
 * @property-read Collection<int, WalletTransaction> $transactions
 *
 * @use HasFactory<MitraWalletFactory>
 */
class MitraWallet extends Model
{
    /** @use HasFactory<MitraWalletFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'mitra_id',
        'saldo',
        'total_pendapatan',
        'total_dicairkan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'saldo' => 'decimal:2',
            'total_pendapatan' => 'decimal:2',
            'total_dicairkan' => 'decimal:2',
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
     * @return HasMany<WalletTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class, 'wallet_id')
            ->orderByDesc('created_at');
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function saldoRupiah(): string
    {
        return 'Rp '.number_format((float) $this->saldo, 0, ',', '.');
    }
}
