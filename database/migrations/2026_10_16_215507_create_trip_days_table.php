<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `trip_days` — itinerary per hari untuk sebuah trip.
     *
     * Auto-generate dari package_days saat trip dibuat. Contoh:
     * Trip "Wisata Pasar Terapung 2D1N" (mulai 20 Okt 2026) punya 2 baris:
     * - hari_ke=1, tanggal=2026-10-20: "Penjemputan & Pasar Terapung"
     * - hari_ke=2, tanggal=2026-10-21: "Wisata Kuliner & Kepulangan"
     *
     * Catatan timezone:
     * - `tanggal` adalah DATE murni (netral timezone).
     * - Dibandingkan dengan `Timezone::today($trip->timezone)` untuk logika daily report.
     *
     * Catatan status:
     * - `status` di-manage oleh Service (bukan otomatis di DB).
     * - `pending`     → belum dimulai
     * - `in_progress` → sedang berjalan (daily report mitra)
     * - `completed`   → selesai (daily report diverifikasi admin)
     *
     * Relasi:
     * - belongsTo Trip
     * - hasMany DailyReport (Fase 4)
     */
    public function up(): void
    {
        Schema::create('trip_days', function (Blueprint $table) {
            $table->id();

            $table->foreignId('trip_id')
                ->constrained('trips')
                ->cascadeOnDelete();

            // Urutan hari (1, 2, 3, ...)
            $table->unsignedSmallInteger('hari_ke');

            // Tanggal (DATE murni)
            $table->date('tanggal');

            // Konten (copy dari package_days)
            $table->string('judul');
            $table->text('deskripsi')->nullable();

            // Status
            $table->string('status', 20)->default('pending');
            // pending | in_progress | completed

            $table->timestamps();

            // 1 trip tidak boleh punya 2 hari dengan nomor sama
            $table->unique(['trip_id', 'hari_ke']);

            // Index untuk query "ambil days dari trip X, urut hari_ke"
            $table->index(['trip_id', 'hari_ke']);

            // Index untuk scheduler (trip hari ini)
            $table->index('tanggal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_days');
    }
};
