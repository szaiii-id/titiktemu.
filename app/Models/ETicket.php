<?php

namespace App\Models;

use Database\Factories\ETicketFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model ETicket — tiket digital untuk client.
 *
 * @property int $id
 * @property string $uuid
 * @property int $trip_id
 * @property int $booking_id
 * @property string $qr_code
 * @property string $pdf_path
 * @property Carbon|null $generated_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class ETicket extends Model
{
    /** @use HasFactory<ETicketFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'trip_id',
        'booking_id',
        'qr_code',
        'pdf_path',
        'generated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
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
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function pdfUrl(): string
    {
        return asset('storage/'.$this->pdf_path);
    }
}
