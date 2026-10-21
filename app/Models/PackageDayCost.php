<?php

namespace App\Models;

use App\Enums\PackageDayCostKategori;
use App\Enums\PackageDayCostSatuan;
use Database\Factories\PackageDayCostFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model PackageDayCost — biaya HPP per hari dalam sebuah paket.
 *
 * @property int $id
 * @property int $package_day_id
 * @property string $nama_biaya
 * @property PackageDayCostKategori $kategori
 * @property numeric-string $jumlah
 * @property PackageDayCostSatuan $satuan
 * @property string|null $catatan
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read PackageDay|null $day
 *
 * @use HasFactory<PackageDayCostFactory>
 */
class PackageDayCost extends Model
{
    /** @use HasFactory<PackageDayCostFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'package_day_id',
        'nama_biaya',
        'kategori',
        'jumlah',
        'satuan',
        'catatan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kategori' => PackageDayCostKategori::class,
            'satuan' => PackageDayCostSatuan::class,
            'jumlah' => 'decimal:2',
        ];
    }

    // ==========================================
    // RELASI
    // ==========================================

    /**
     * @return BelongsTo<PackageDay, $this>
     */
    public function day(): BelongsTo
    {
        return $this->belongsTo(PackageDay::class, 'package_day_id');
    }

    // ==========================================
    // HELPER
    // ==========================================

    /**
     * Hitung subtotal biaya ini berdasarkan satuan & konteks.
     *
     * @param  int  $maxPeserta  Dari package.max_peserta (untuk satuan per_orang)
     * @param  int  $durasiHari  Dari package.durasi_hari (untuk satuan per_hari)
     */
    public function subtotal(int $maxPeserta = 1, int $durasiHari = 1): float
    {
        $jumlah = (float) $this->jumlah;

        return match ($this->satuan) {
            PackageDayCostSatuan::TOTAL => $jumlah,
            PackageDayCostSatuan::PER_ORANG => $jumlah * $maxPeserta,
            PackageDayCostSatuan::PER_HARI => $jumlah * $durasiHari,
        };
    }

    /**
     * Format jumlah biaya sebagai string Rupiah.
     */
    public function jumlahRupiah(): string
    {
        return 'Rp '.number_format((float) $this->jumlah, 0, ',', '.');
    }

    /**
     * Label satuan (Bahasa Indonesia).
     */
    public function satuanLabel(): string
    {
        return $this->satuan->label();
    }
}
