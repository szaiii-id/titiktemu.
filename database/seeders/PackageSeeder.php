<?php

namespace Database\Seeders;

use App\Enums\PackageDayCostKategori;
use App\Enums\PackageDayCostSatuan;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use App\Models\PackageFacility;
use App\Models\User;
use Illuminate\Database\Seeder;

class PackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Membuat 3 paket wisata contoh:
     * 1. Wisata Pasar Terapung 2D1N (Banjarmasin, WITA)
     * 2. Petualangan Hutan Kalimantan 3D2N (Palangkaraya, WITA)
     * 3. Wisata Kuliner Banjarmasin 1D (Banjarmasin, WITA)
     *
     * Admin default = admin@titiktemu.test (dari UserSeeder).
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@titiktemu.test')->first();

        if (! $admin) {
            $this->command->warn('⚠️  Admin tidak ditemukan. Jalankan UserSeeder dulu.');

            return;
        }

        // ==========================================
        // 1. WISATA PASAR TERAPUNG 2D1N
        // ==========================================
        $this->seedPasarTerapung($admin);

        // ==========================================
        // 2. PETUALANGAN HUTAN KALIMANTAN 3D2N
        // ==========================================
        $this->seedHutanKalimantan($admin);

        // ==========================================
        // 3. WISATA KULINER BANJARMASIN 1D
        // ==========================================
        $this->seedKulinerBanjarmasin($admin);

        $this->command->info('✅ PackageSeeder selesai: 3 paket wisata contoh.');
    }

    /**
     * Paket 1: Wisata Pasar Terapung 2D1N — status aktif.
     */
    protected function seedPasarTerapung(User $admin): void
    {
        $package = Package::updateOrCreate(
            ['kode' => 'PKG-'.now()->year.'-001'],
            [
                'nama' => 'Wisata Pasar Terapung 2D1N',
                'slug' => 'wisata-pasar-terapung-2d1n',
                'deskripsi' => 'Nikmati pengalaman unik menyusuri Sungai Martapura menuju Pasar Terapung Lok Baintan. Ditemani pemandu lokal, Anda akan melihat aktivitas jual-beli di atas perahu tradisional yang sudah berlangsung ratusan tahun. Termasuk menginap 1 malam di homestay tepi sungai.',
                'kategori' => PackageKategori::BUDAYA->value,
                'durasi_hari' => 2,
                'durasi_malam' => 1,
                'harga_per_orang' => 850000,
                'harga_per_rombongan' => null,
                'min_peserta' => 2,
                'max_peserta' => 10,
                'timezone' => 'Asia/Makassar',
                'status' => PackageStatus::AKTIF->value,
                'created_by' => $admin->id,
            ]
        );

        // Hari 1
        $day1 = PackageDay::updateOrCreate(
            ['package_id' => $package->id, 'hari_ke' => 1],
            [
                'judul' => 'Penjemputan & Pasar Terapung',
                'deskripsi' => 'Jemput di hotel/bandara, langsung menuju dermaga untuk menyusuri Pasar Terapung Lok Baintan. Sarapan khas Banjar di atas kelotok.',
                'jam_mulai' => '06:00',
                'jam_selesai' => '12:00',
                'lokasi' => 'Pasar Terapung Lok Baintan',
            ]
        );

        $this->seedCosts($day1, [
            ['Sewa Kelotok', PackageDayCostKategori::TRANSPORTASI, 400000, PackageDayCostSatuan::TOTAL],
            ['Sarapan Khas Banjar', PackageDayCostKategori::KONSUMSI, 25000, PackageDayCostSatuan::PER_ORANG],
            ['Guide Fee', PackageDayCostKategori::LAINNYA, 200000, PackageDayCostSatuan::TOTAL],
            ['Tiket Masuk', PackageDayCostKategori::TIKET, 15000, PackageDayCostSatuan::PER_ORANG],
        ]);

        // Hari 2
        $day2 = PackageDay::updateOrCreate(
            ['package_id' => $package->id, 'hari_ke' => 2],
            [
                'judul' => 'Wisata Kuliner & Kepulangan',
                'deskripsi' => 'Kunjungan ke sentra kuliner khas Banjarmasin: Ketupat Kandangan, Soto Banjar, dan es kelapa. Setelah makan siang, diantar kembali ke hotel/bandara.',
                'jam_mulai' => '08:00',
                'jam_selesai' => '15:00',
                'lokasi' => 'Pusat Kuliner Banjarmasin',
            ]
        );

        $this->seedCosts($day2, [
            ['Makan Siang', PackageDayCostKategori::KONSUMSI, 50000, PackageDayCostSatuan::PER_ORANG],
            ['Transportasi Lokal', PackageDayCostKategori::TRANSPORTASI, 300000, PackageDayCostSatuan::TOTAL],
            ['Homestay 1 Malam', PackageDayCostKategori::AKOMODASI, 250000, PackageDayCostSatuan::TOTAL],
        ]);

        // Fasilitas
        $this->seedFacilities($package, [
            ['include', 'Transportasi PP dalam kota'],
            ['include', 'Pemandu wisata lokal'],
            ['include', 'Sewa kelotok'],
            ['include', 'Makan 3x'],
            ['include', 'Homestay 1 malam'],
            ['include', 'Tiket masuk objek wisata'],
            ['exclude', 'Tiket pesawat'],
            ['exclude', 'Pengeluaran pribadi'],
            ['exclude', 'Tipping guide'],
        ]);
    }

    /**
     * Paket 2: Petualangan Hutan Kalimantan 3D2N — status aktif.
     */
    protected function seedHutanKalimantan(User $admin): void
    {
        $package = Package::updateOrCreate(
            ['kode' => 'PKG-'.now()->year.'-002'],
            [
                'nama' => 'Petualangan Hutan Kalimantan 3D2N',
                'slug' => 'petualangan-hutan-kalimantan-3d2n',
                'deskripsi' => 'Jelajahi keindahan hutan tropis Kalimantan. Trekking, camping, dan pengamatan satwa liar (orangutan, bekantan). Cocok untuk pencinta alam dan petualangan.',
                'kategori' => PackageKategori::PETUALANGAN->value,
                'durasi_hari' => 3,
                'durasi_malam' => 2,
                'harga_per_orang' => 1500000,
                'harga_per_rombongan' => null,
                'min_peserta' => 4,
                'max_peserta' => 15,
                'timezone' => 'Asia/Makassar',
                'status' => PackageStatus::AKTIF->value,
                'created_by' => $admin->id,
            ]
        );

        $days = [
            [
                'hari_ke' => 1,
                'judul' => 'Perjalanan ke Base Camp',
                'deskripsi' => 'Perjalanan darat menuju base camp di tepi hutan. Briefing keselamatan dan persiapan trekking.',
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
                'lokasi' => 'Base Camp Hutan Kalimantan',
                'costs' => [
                    ['Transportasi Darat', PackageDayCostKategori::TRANSPORTASI, 750000, PackageDayCostSatuan::TOTAL],
                    ['Makan 3x', PackageDayCostKategori::KONSUMSI, 75000, PackageDayCostSatuan::PER_ORANG],
                    ['Camping Equipment', PackageDayCostKategori::AKOMODASI, 300000, PackageDayCostSatuan::TOTAL],
                ],
            ],
            [
                'hari_ke' => 2,
                'judul' => 'Trekking & Wildlife Watching',
                'deskripsi' => 'Trekking seharian di hutan tropis. Berburu spot terbaik untuk melihat orangutan dan bekantan. Makan siang di tengah hutan.',
                'jam_mulai' => '05:00',
                'jam_selesai' => '18:00',
                'lokasi' => 'Hutan Tropis Kalimantan',
                'costs' => [
                    ['Guide Fee', PackageDayCostKategori::LAINNYA, 400000, PackageDayCostSatuan::TOTAL],
                    ['Makan 3x', PackageDayCostKategori::KONSUMSI, 80000, PackageDayCostSatuan::PER_ORANG],
                    ['Snack & Air', PackageDayCostKategori::KONSUMSI, 30000, PackageDayCostSatuan::PER_ORANG],
                    ['Kamera Binocular', PackageDayCostKategori::LAINNYA, 100000, PackageDayCostSatuan::PER_ORANG],
                ],
            ],
            [
                'hari_ke' => 3,
                'judul' => 'Kembali ke Kota',
                'deskripsi' => 'Pagi bebas, sarapan bersama, lalu perjalanan kembali ke kota. Singgah di pusat oleh-oleh khas Kalimantan.',
                'jam_mulai' => '07:00',
                'jam_selesai' => '15:00',
                'lokasi' => 'Kota Banjarmasin',
                'costs' => [
                    ['Transportasi Kembali', PackageDayCostKategori::TRANSPORTASI, 750000, PackageDayCostSatuan::TOTAL],
                    ['Sarapan', PackageDayCostKategori::KONSUMSI, 35000, PackageDayCostSatuan::PER_ORANG],
                ],
            ],
        ];

        foreach ($days as $dayData) {
            $costs = $dayData['costs'];
            unset($dayData['costs']);

            $day = PackageDay::updateOrCreate(
                ['package_id' => $package->id, 'hari_ke' => $dayData['hari_ke']],
                array_merge($dayData, ['package_id' => $package->id])
            );

            $this->seedCosts($day, $costs);
        }

        $this->seedFacilities($package, [
            ['include', 'Transportasi PP darat'],
            ['include', 'Pemandu & guide lokal'],
            ['include', 'Camping equipment'],
            ['include', 'Makan 3x sehari'],
            ['include', 'Tiket masuk hutan'],
            ['include', 'Asuransi perjalanan'],
            ['include', 'Dokumentasi'],
            ['exclude', 'Tiket pesawat ke Banjarmasin'],
            ['exclude', 'Peralatan pribadi (sepatu trekking, jaket)'],
            ['exclude', 'Tipping guide'],
            ['exclude', 'Pengeluaran pribadi'],
        ]);
    }

    /**
     * Paket 3: Wisata Kuliner Banjarmasin 1D — status draft.
     */
    protected function seedKulinerBanjarmasin(User $admin): void
    {
        $package = Package::updateOrCreate(
            ['kode' => 'PKG-'.now()->year.'-003'],
            [
                'nama' => 'Wisata Kuliner Banjarmasin 1D',
                'slug' => 'wisata-kuliner-banjarmasin-1d',
                'deskripsi' => 'Jelajahi kuliner legendaris Banjarmasin dalam sehari. Kunjungi 5 spot kuliner terbaik: Ketupat Kandangan, Soto Banjar, Nasi Itik Gambut, Apam Barabai, dan Es Kelapa Muda.',
                'kategori' => PackageKategori::KULINER->value,
                'durasi_hari' => 1,
                'durasi_malam' => 0,
                'harga_per_orang' => 350000,
                'harga_per_rombongan' => null,
                'min_peserta' => 2,
                'max_peserta' => 12,
                'timezone' => 'Asia/Makassar',
                'status' => PackageStatus::DRAFT->value, // draft, belum aktif
                'created_by' => $admin->id,
            ]
        );

        $day = PackageDay::updateOrCreate(
            ['package_id' => $package->id, 'hari_ke' => 1],
            [
                'judul' => 'Food Tour Kuliner Banjar',
                'deskripsi' => 'Kunjungan ke 5 spot kuliner legendaris. Setiap spot didampingi food guide yang akan bercerita tentang sejarah & filosofi kuliner Banjar.',
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
                'lokasi' => 'Pusat Kota Banjarmasin',
            ]
        );

        $this->seedCosts($day, [
            ['Transportasi Lokal', PackageDayCostKategori::TRANSPORTASI, 300000, PackageDayCostSatuan::TOTAL],
            ['Makan di 5 Spot', PackageDayCostKategori::KONSUMSI, 150000, PackageDayCostSatuan::PER_ORANG],
            ['Food Guide Fee', PackageDayCostKategori::LAINNYA, 250000, PackageDayCostSatuan::TOTAL],
        ]);

        $this->seedFacilities($package, [
            ['include', 'Transportasi lokal'],
            ['include', 'Food guide'],
            ['include', 'Makan di 5 spot kuliner'],
            ['exclude', 'Tiket pesawat'],
            ['exclude', 'Pengeluaran pribadi'],
        ]);
    }

    /**
     * Helper: seed costs untuk sebuah day.
     *
     * @param  array<int, array{0: string, 1: PackageDayCostKategori, 2: float, 3: PackageDayCostSatuan}>  $costs
     */
    protected function seedCosts(PackageDay $day, array $costs): void
    {
        foreach ($costs as $index => [$nama, $kategori, $jumlah, $satuan]) {
            PackageDayCost::updateOrCreate(
                [
                    'package_day_id' => $day->id,
                    'nama_biaya' => $nama,
                ],
                [
                    'kategori' => $kategori->value,
                    'jumlah' => $jumlah,
                    'satuan' => $satuan->value,
                ]
            );
        }
    }

    /**
     * Helper: seed facilities untuk sebuah package.
     *
     * @param  array<int, array{0: string, 1: string}>  $facilities  Format: [tipe, nama]
     */
    protected function seedFacilities(Package $package, array $facilities): void
    {
        // Counter urutan per tipe
        $urutan = ['include' => 0, 'exclude' => 0];

        foreach ($facilities as [$tipe, $nama]) {
            $urutan[$tipe]++;

            PackageFacility::updateOrCreate(
                [
                    'package_id' => $package->id,
                    'tipe' => $tipe,
                    'nama' => $nama,
                ],
                [
                    'urutan' => $urutan[$tipe],
                ]
            );
        }
    }
}
