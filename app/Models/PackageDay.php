<?php

namespace App\Models;

use Database\Factories\PackageDayFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Model PackageDay — itinerary per hari dalam sebuah paket.
 *
 * Contoh: Paket "Pasar Terapung 2D1N" punya 2 baris:
 * - hari_ke=1: "Penjemputan & Pasar Terapung"
 * - hari_ke=2: "Wisata Kuliner & Kepulangan"
 *
 * Relasi:
 * - belongsTo Package
 * - hasMany PackageDayCost (HPP per hari)
 *
 * Tidak ada soft delete — karena package_days murni template,
 * dihapus berarti dihapus permanen (cascade ke costs).
 *
 * @property int $id
 * @property int $package_id
 * @property int $hari_ke
 * @property string $judul
 * @property string|null $deskripsi
 * @property string|null $jam_mulai
 * @property string|null $jam_selesai
 * @property string|null $lokasi
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Package|null $package
 * @property-read Collection<int, PackageDayCost> $costs
 *
 * @use HasFactory<PackageDayFactory>
 */
class PackageDay extends Model
{
    /** @use HasFactory<PackageDayFactory> */
    use HasFactory;

    /**
     * Atribut yang dapat diisi secara massal.
     *
     * @var list<string>
     */
    protected $fillable = [
        'package_id',
        'hari_ke',
        'judul',
        'deskripsi',
        'jam_mulai',
        'jam_selesai',
        'lokasi',
    ];

    /**
     * Casting atribut.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hari_ke' => 'integer',
            // jam_mulai & jam_selesai dibiarkan string 'HH:mm:ss'
            // karena ini jam lokal (bukan moment UTC).
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * Paket induk dari hari ini.
     *
     * @return BelongsTo<Package, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    /**
     * Daftar biaya HPP untuk hari ini.
     *
     * @return HasMany<PackageDayCost, $this>
     */
    public function costs(): HasMany
    {
        return $this->hasMany(PackageDayCost::class);
    }

    // ==========================================
    // HELPER
    // ==========================================

    /**
     * Format jam_mulai menjadi 'HH:mm' (tanpa detik).
     *
     * Return null kalau jam_mulai kosong.
     */
    public function jamMulaiShort(): ?string
    {
        if ($this->jam_mulai === null || $this->jam_mulai === '') {
            return null;
        }

        return substr($this->jam_mulai, 0, 5);
    }

    /**
     * Format jam_selesai menjadi 'HH:mm' (tanpa detik).
     *
     * Return null kalau jam_selesai kosong.
     */
    public function jamSelesaiShort(): ?string
    {
        if ($this->jam_selesai === null || $this->jam_selesai === '') {
            return null;
        }

        return substr($this->jam_selesai, 0, 5);
    }

    /**
     * Hitung total HPP hari ini saja (butuh konteks package).
     */
    public function totalHpp(): float
    {
        $package = $this->package;

        if ($package === null) {
            return 0.0;
        }

        $maxPeserta = $package->max_peserta;
        $durasiHari = $package->durasi_hari;

        $total = 0.0;

        foreach ($this->costs as $cost) {
            $total += $cost->subtotal($maxPeserta, $durasiHari);
        }

        return $total;
    }

    /**
     * Apakah hari ini punya minimal 1 biaya HPP?
     */
    public function hasCosts(): bool
    {
        return $this->costs()->exists();
    }
}
