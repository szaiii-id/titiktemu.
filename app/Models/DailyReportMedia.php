<?php

namespace App\Models;

use Database\Factories\DailyReportMediaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model DailyReportMedia — foto bukti untuk daily report.
 *
 * @property int $id
 * @property int $daily_report_id
 * @property string $path
 * @property int $urutan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read DailyReport|null $dailyReport
 *
 * @use HasFactory<DailyReportMediaFactory>
 */
class DailyReportMedia extends Model
{
    /** @use HasFactory<DailyReportMediaFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_report_id',
        'path',
        'urutan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'urutan' => 'integer',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<DailyReport, $this>
     */
    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }

    // ==========================================
    // HELPER
    // ==========================================

    public function url(): string
    {
        return asset('storage/'.$this->path);
    }
}
