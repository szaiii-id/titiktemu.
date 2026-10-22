<?php

namespace App\Models;

use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Support\Timezone;
use Database\Factories\PackageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Model Package — paket wisata template.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string $slug
 * @property string|null $deskripsi
 * @property PackageKategori $kategori
 * @property int $durasi_hari
 * @property int $durasi_malam
 * @property numeric-string $harga_per_orang
 * @property numeric-string|null $harga_per_rombongan
 * @property int $min_peserta
 * @property int $max_peserta
 * @property string $timezone
 * @property string|null $cover_image
 * @property PackageStatus $status
 * @property int $created_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property-read User|null $creator
 * @property-read Collection<int, PackageDay> $days
 * @property-read Collection<int, PackageFacility> $facilities
 * @property-read Collection<int, Booking> $bookings
 *
 * @use HasFactory<PackageFactory>
 */
class Package extends Model
{
    /** @use HasFactory<PackageFactory> */
    use HasFactory;

    use SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'kode',
        'nama',
        'slug',
        'deskripsi',
        'kategori',
        'durasi_hari',
        'durasi_malam',
        'harga_per_orang',
        'harga_per_rombongan',
        'min_peserta',
        'max_peserta',
        'timezone',
        'cover_image',
        'status',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kategori' => PackageKategori::class,
            'status' => PackageStatus::class,
            'durasi_hari' => 'integer',
            'durasi_malam' => 'integer',
            'harga_per_orang' => 'decimal:2',
            'harga_per_rombongan' => 'decimal:2',
            'min_peserta' => 'integer',
            'max_peserta' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<PackageDay, $this>
     */
    public function days(): HasMany
    {
        return $this->hasMany(PackageDay::class)->orderBy('hari_ke');
    }

    /**
     * @return HasMany<PackageFacility, $this>
     */
    public function facilities(): HasMany
    {
        return $this->hasMany(PackageFacility::class)->orderBy('urutan');
    }

    /**
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    // ==========================================
    // SCOPE
    // ==========================================

    /**
     * @param  Builder<Package>  $query
     * @return Builder<Package>
     */
    public function scopeAktif(Builder $query): Builder
    {
        return $query->where('status', PackageStatus::AKTIF->value);
    }

    /**
     * @param  Builder<Package>  $query
     * @return Builder<Package>
     */
    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', PackageStatus::DRAFT->value);
    }

    /**
     * @param  Builder<Package>  $query
     * @return Builder<Package>
     */
    public function scopeArsip(Builder $query): Builder
    {
        return $query->where('status', PackageStatus::ARSIP->value);
    }

    // ==========================================
    // HELPER — STATUS
    // ==========================================

    public function isAktif(): bool
    {
        return $this->status === PackageStatus::AKTIF;
    }

    public function isDraft(): bool
    {
        return $this->status === PackageStatus::DRAFT;
    }

    public function isArsip(): bool
    {
        return $this->status === PackageStatus::ARSIP;
    }

    public function hasDays(): bool
    {
        return $this->days()->exists();
    }

    // ==========================================
    // HELPER — HPP & MARGIN
    // ==========================================

    /**
     * Hitung total HPP (Harga Pokok Penjualan) paket ini.
     *
     * @return array{
     *     total: float,
     *     per_kategori: array<string, float>,
     *     breakdown: array<int, array{
     *         hari_ke: int,
     *         nama_biaya: string,
     *         kategori: string,
     *         jumlah: float,
     *         satuan: string,
     *         subtotal: float
     *     }>
     * }
     */
    public function calculateHpp(): array
    {
        $days = $this->relationLoaded('days')
            ? $this->days
            : $this->days()->with('costs')->get();

        $total = 0.0;
        $perKategori = [];
        $breakdown = [];

        foreach ($days as $day) {
            foreach ($day->costs as $cost) {
                $subtotal = $cost->subtotal($this->max_peserta, $this->durasi_hari);

                $total += $subtotal;

                // cost->kategori sudah cast enum, tidak perlu instanceof
                $kategori = $cost->kategori->value;

                // cost->satuan sudah cast enum, tidak perlu instanceof
                $satuan = $cost->satuan->value;

                $perKategori[$kategori] = ($perKategori[$kategori] ?? 0.0) + $subtotal;

                $breakdown[] = [
                    'hari_ke' => $day->hari_ke,
                    'nama_biaya' => $cost->nama_biaya,
                    'kategori' => $kategori,
                    'jumlah' => (float) $cost->jumlah,
                    'satuan' => $satuan,
                    'subtotal' => $subtotal,
                ];
            }
        }

        return [
            'total' => $total,
            'per_kategori' => $perKategori,
            'breakdown' => $breakdown,
        ];
    }

    /**
     * @return array{
     *     hpp_total: float,
     *     hpp_per_orang: float,
     *     harga_jual_per_orang: float,
     *     margin_per_orang: float,
     *     margin_persen: float
     * }
     */
    public function calculateMargin(): array
    {
        $hpp = $this->calculateHpp();
        $hppPerOrang = $this->max_peserta > 0
            ? $hpp['total'] / $this->max_peserta
            : 0.0;

        $hargaJual = (float) $this->harga_per_orang;
        $margin = $hargaJual - $hppPerOrang;
        $marginPersen = $hargaJual > 0 ? ($margin / $hargaJual) * 100 : 0.0;

        return [
            'hpp_total' => $hpp['total'],
            'hpp_per_orang' => $hppPerOrang,
            'harga_jual_per_orang' => $hargaJual,
            'margin_per_orang' => $margin,
            'margin_persen' => $marginPersen,
        ];
    }

    public function timezoneOrDefault(): string
    {
        return $this->timezone ?: Timezone::DEFAULT;
    }
}
