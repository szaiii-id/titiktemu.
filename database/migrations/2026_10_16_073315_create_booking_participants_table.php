<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `booking_participants` — data peserta dalam sebuah booking.
     *
     * Satu booking bisa punya banyak peserta. Contoh:
     * Booking "BKG-2026-001" dengan 4 peserta:
     * - Budi Santoso, 30 thn, 0812-xxx, "Alergi seafood"
     * - Ani Wijaya, 28 thn, 0813-xxx, null
     * - Citra Dewi, 25 thn, 0814-xxx, "Vegetarian"
     * - Dani Pratama, 35 thn, 0815-xxx, null
     *
     * Catatan:
     * - `umur` nullable — client mungkin tidak tahu umur semua peserta.
     * - `no_hp` nullable — sama.
     * - `catatan` nullable — alergi, permintaan khusus, dll.
     * - ON DELETE CASCADE: kalau booking dihapus, peserta ikut terhapus.
     */
    public function up(): void
    {
        Schema::create('booking_participants', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings')
                ->cascadeOnDelete();

            // Data peserta
            $table->string('nama');
            $table->unsignedSmallInteger('umur')->nullable();
            $table->string('no_hp', 20)->nullable();
            $table->text('catatan')->nullable();          // "Alergi seafood"

            $table->timestamps();

            // Index untuk query "peserta dari booking X"
            $table->index('booking_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_participants');
    }
};
