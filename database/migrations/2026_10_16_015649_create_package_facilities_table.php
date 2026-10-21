<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `package_facilities` — daftar fasilitas include/exclude
     * untuk sebuah paket wisata.
     *
     * Contoh paket "Pasar Terapung 2D1N":
     *
     * | tipe    | nama                          | urutan |
     * |---------|-------------------------------|--------|
     * | include | Transportasi PP               |      1 |
     * | include | Pemandu Wisata                |      2 |
     * | include | Makan 3x                      |      3 |
     * | include | Tiket Masuk Objek Wisata      |      4 |
     * | exclude | Tiket Pesawat                 |      1 |
     * | exclude | Pengeluaran Pribadi           |      2 |
     * | exclude | Tipping Guide                 |      3 |
     *
     * Catatan:
     * - `tipe` = 'include' (termasuk) atau 'exclude' (tidak termasuk).
     * - `urutan` untuk sorting di UI, mulai dari 1.
     * - ON DELETE CASCADE: kalau package dihapus, semua fasilitas ikut.
     */
    public function up(): void
    {
        Schema::create('package_facilities', function (Blueprint $table) {
            $table->id();

            $table->foreignId('package_id')
                ->constrained('packages')
                ->cascadeOnDelete();

            // Tipe: include / exclude
            $table->string('tipe', 10);                 // include | exclude

            // Nama fasilitas
            $table->string('nama');                     // "Makan 3x", "Tiket Pesawat"

            // Urutan tampil (ascending)
            $table->unsignedSmallInteger('urutan')->default(0);

            $table->timestamps();

            // Index untuk query "ambil semua fasilitas dari package X, urut by tipe & urutan"
            $table->index(['package_id', 'tipe', 'urutan']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('package_facilities');
    }
};
