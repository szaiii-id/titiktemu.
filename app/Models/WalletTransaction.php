<?php

namespace App\Models;

use App\Enums\WalletTransactionCategory;
use App\Enums\WalletTransactionType;
use Database\Factories\WalletTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model WalletTransaction — mutasi saldo wallet mitra.
 *
 * @property int $id
 * @property int $wallet_id
 * @property WalletTransactionType $tipe
 * @property numeric-string $jumlah
 * @property numeric-string $saldo_setelah
 * @property WalletTransactionCategory $kategori
 * @property string|null $referensi_type
 * @property int|null $referensi_id
 * @property string $deskripsi
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read MitraWallet|null $wallet
 *
 * @use HasFactory<WalletTransactionFactory>
 */
class WalletTransaction extends Model
{
    /** @use HasFactory<WalletTransactionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'wallet_id',
        'tipe',
        'jumlah',
        'saldo_setelah',
        'kategori',
        'referensi_type',
        'referensi_id',
        'deskripsi',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tipe' => WalletTransactionType::class,
            'kategori' => WalletTransactionCategory::class,
            'jumlah' => 'decimal:2',
            'saldo_setelah' => 'decimal:2',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<MitraWallet, $this>
     */
    public function wallet(): BelongsTo
    {
        return $this->belongsTo(MitraWallet::class, 'wallet_id');
    }
}
