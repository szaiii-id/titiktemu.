<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `daily_report_media` — foto bukti untuk sebuah daily report.
     *
     * Satu daily_report bisa punya 1-2 foto. Contoh:
     * - Report mitra Budi di hari 1:
     *   * Foto 1: selfie di Pasar Terapung
     *   * Foto 2: peserta sarapan bersama
     *
     * Catatan:
     * - Foto wajib 1-2 (validasi di Service).
     * - Path relatif ke `storage/app/public/daily-reports/`.
     * - `urutan` untuk display order (1, 2).
     * - ON DELETE CASCADE: kalau daily_report dihapus, media ikut terhapus.
     */
    public function up(): void
    {
        Schema::create('daily_report_media', function (Blueprint $table) {
            $table->id();

            $table->foreignId('daily_report_id')
                ->constrained('daily_reports')
                ->cascadeOnDelete();

            // Path relatif ke storage/app/public/
            $table->string('path');

            // Urutan tampil (1, 2)
            $table->unsignedSmallInteger('urutan')->default(0);

            $table->timestamps();

            // Index untuk query "ambil media dari report X, urut urutan"
            $table->index(['daily_report_id', 'urutan']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_report_media');
    }
};
