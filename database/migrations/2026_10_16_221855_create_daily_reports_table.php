<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `daily_reports` — laporan harian mitra untuk sebuah trip_day.
     *
     * Satu mitra bisa submit 1 laporan per trip_day (UNIQUE).
     * Contoh: Budi mitra lead di Trip TRP-2026-001 (2 hari):
     * - Hari 1 → 1 daily_report (foto: 2)
     * - Hari 2 → 1 daily_report (foto: 1)
     *
     * Alur status:
     *   submitted → verified
     *             ↘ rejected → (mitra resubmit)
     *
     * Catatan:
     * - Report `submitted` oleh mitra setelah selesai kegiatan hari itu.
     * - Admin verify/reject via UI.
     * - Report `rejected` harus di-resubmit oleh mitra.
     * - Media (foto) di tabel `daily_report_media`.
     * - ON DELETE CASCADE: kalau trip_day dihapus, report ikut terhapus.
     */
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();

            $table->foreignId('trip_day_id')
                ->constrained('trip_days')
                ->cascadeOnDelete();

            $table->foreignId('mitra_id')
                ->constrained('users')
                ->restrictOnDelete();                     // mitra tidak bisa dihapus kalau masih punya report

            // Konten
            $table->text('catatan')->nullable();          // catatan mitra

            // Status
            $table->string('status', 20)->default('submitted');
            // submitted | verified | rejected

            // Timestamps untuk audit
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('verified_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            // 1 mitra = 1 report per trip_day
            $table->unique(['trip_day_id', 'mitra_id']);

            // Index untuk query umum
            $table->index('mitra_id');
            $table->index('status');
            $table->index(['status', 'submitted_at']);    // untuk admin list pending
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
