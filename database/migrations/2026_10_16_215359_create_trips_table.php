<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `trips` — instance dari package yang benar-benar jalan.
     *
     * Auto-create saat booking status → `confirmed`.
     *
     * Relasi:
     * - belongsTo Booking (booking yang generate trip ini)
     * - belongsTo Package (referensi, tapi data di-snapshot)
     * - hasMany TripMitra (mitra yang di-assign)
     * - hasMany TripDay (itinerary per hari)
     *
     * Catatan timezone:
     * - `tanggal_mulai`, `tanggal_selesai` = DATE murni (netral timezone).
     * - `timezone` = snapshot dari package (lokasi tour).
     * - Semua timestamp (created_at, updated_at) UTC.
     *
     * Catatan snapshot:
     * - `snapshot_package` JSON berisi data paket saat trip dibuat.
     * - Perubahan paket setelah trip dibuat TIDAK affect trip.
     * - Snapshot mencakup: nama, kode, durasi, timezone, days, facilities.
     *
     * Catatan enum:
     * - `status` disimpan sebagai string + PHP Enum cast di model.
     */
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();

            // Identitas
            $table->string('kode', 50)->unique();         // TRP-2026-001

            // Relasi
            $table->foreignId('booking_id')
                ->unique()                                // 1 booking = 1 trip
                ->constrained('bookings')
                ->restrictOnDelete();                     // booking tidak bisa dihapus kalau ada trip

            $table->foreignId('package_id')
                ->constrained('packages')
                ->restrictOnDelete();

            // Snapshot package (JSON)
            $table->jsonb('snapshot_package');

            // Tanggal (DATE murni)
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');

            // Peserta (copy dari booking saat trip dibuat)
            $table->unsignedSmallInteger('jumlah_peserta');

            // Timezone lokasi tour (snapshot dari package)
            $table->string('timezone', 50);

            // Status
            $table->string('status', 20)->default('scheduled');
            // scheduled | active | completed | cancelled

            $table->timestamps();

            // Index untuk query umum
            $table->index('status');
            $table->index('tanggal_mulai');
            $table->index(['tanggal_mulai', 'status']);   // untuk scheduler auto-active
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
