<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `trip_mitras` — pivot table: mitra yang di-assign ke sebuah trip.
     *
     * Satu trip bisa punya banyak mitra (lead + asisten).
     * Satu mitra bisa di-assign ke banyak trip.
     *
     * Contoh:
     * - Trip TRP-2026-001:
     *   * Budi Santoso (lead)    — honor Rp 500.000/hari
     *   * Ani Wijaya (asisten)   — honor Rp 300.000/hari
     *
     * Catatan:
     * - `role` menentukan peran mitra di trip.
     * - `honor` adalah honor total untuk trip ini (bukan per hari).
     * - `honor_tipe` menentukan cara hitung: flat atau per_hari.
     * - `instruksi` adalah instruksi khusus dari admin.
     * - UNIQUE (trip_id, mitra_id) — 1 mitra hanya bisa 1x di 1 trip.
     * - ON DELETE CASCADE — kalau trip dihapus, assignment ikut terhapus.
     */
    public function up(): void
    {
        Schema::create('trip_mitras', function (Blueprint $table) {
            $table->id();

            $table->foreignId('trip_id')
                ->constrained('trips')
                ->cascadeOnDelete();

            $table->foreignId('mitra_id')
                ->constrained('users')
                ->restrictOnDelete();                     // mitra tidak bisa dihapus kalau masih punya trip

            // Peran mitra di trip
            $table->string('role', 20)->default('lead');
            // lead | asisten

            // Honor
            $table->decimal('honor', 12, 2);
            $table->string('honor_tipe', 20)->default('flat');
            // flat | per_hari

            // Instruksi khusus dari admin
            $table->text('instruksi')->nullable();

            // Audit: siapa yang assign
            $table->foreignId('assigned_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('assigned_at')->nullable();

            $table->timestamps();

            // 1 mitra hanya bisa 1x di 1 trip
            $table->unique(['trip_id', 'mitra_id']);

            // Index untuk query umum
            $table->index('mitra_id');                    // untuk "trip saya" (mitra)
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_mitras');
    }
};
