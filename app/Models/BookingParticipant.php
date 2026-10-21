<?php

namespace App\Models;

use Database\Factories\BookingParticipantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model BookingParticipant — data peserta dalam sebuah booking.
 *
 * @property int $id
 * @property int $booking_id
 * @property string $nama
 * @property int|null $umur
 * @property string|null $no_hp
 * @property string|null $catatan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Booking|null $booking
 *
 * @use HasFactory<BookingParticipantFactory>
 */
class BookingParticipant extends Model
{
    /** @use HasFactory<BookingParticipantFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'booking_id',
        'nama',
        'umur',
        'no_hp',
        'catatan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'umur' => 'integer',
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

    // ==========================================
    // HELPER
    // ==========================================

    public function hasCatatan(): bool
    {
        return ! empty($this->catatan);
    }

    public function hasNoHp(): bool
    {
        return ! empty($this->no_hp);
    }

    public function umurLabel(): string
    {
        return $this->umur ? "{$this->umur} thn" : '-';
    }
}
