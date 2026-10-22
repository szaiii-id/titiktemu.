<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model AppNotification — notifikasi in-app untuk semua user.
 *
 * Menggunakan tabel `notifications` (untuk menghindari konflik dengan
 * Laravel notification system bawaan).
 *
 * @property string $id
 * @property int $user_id
 * @property string $tipe
 * @property string $judul
 * @property string $pesan
 * @property array<string, mixed>|null $data
 * @property Carbon|null $read_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class AppNotification extends Model
{
    use HasUuids;

    /**
     * @var string
     */
    protected $table = 'notifications';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'user_id',
        'tipe',
        'judul',
        'pesan',
        'data',
        'read_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }
}
