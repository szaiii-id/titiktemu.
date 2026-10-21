<?php

namespace App\Models;

use App\Enums\PackageFacilityTipe;
use Database\Factories\PackageFacilityFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model PackageFacility — fasilitas include/exclude paket wisata.
 *
 * @property int $id
 * @property int $package_id
 * @property PackageFacilityTipe $tipe
 * @property string $nama
 * @property int $urutan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Package|null $package
 *
 * @use HasFactory<PackageFacilityFactory>
 */
class PackageFacility extends Model
{
    /** @use HasFactory<PackageFacilityFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'package_id',
        'tipe',
        'nama',
        'urutan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tipe' => PackageFacilityTipe::class,
            'urutan' => 'integer',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<Package, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<PackageFacility>  $query
     * @return Builder<PackageFacility>
     */
    public function scopeInclude(Builder $query): Builder
    {
        return $query->where('tipe', PackageFacilityTipe::INCLUDE->value);
    }

    /**
     * @param  Builder<PackageFacility>  $query
     * @return Builder<PackageFacility>
     */
    public function scopeExclude(Builder $query): Builder
    {
        return $query->where('tipe', PackageFacilityTipe::EXCLUDE->value);
    }

    // ==========================================
    // HELPER
    // ==========================================

    /**
     * Apakah fasilitas ini tipe include?
     */
    public function isInclude(): bool
    {
        return $this->tipe === PackageFacilityTipe::INCLUDE;
    }

    /**
     * Apakah fasilitas ini tipe exclude?
     */
    public function isExclude(): bool
    {
        return $this->tipe === PackageFacilityTipe::EXCLUDE;
    }

    /**
     * Label tipe (Bahasa Indonesia).
     */
    public function tipeLabel(): string
    {
        return $this->tipe->label();
    }
}
