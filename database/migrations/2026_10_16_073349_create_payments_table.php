<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel `payments` — bukti pembayaran manual dari client.
     *
     * Alur:
     * 1. Client booking → dapat instruksi transfer manual.
     * 2. Client transfer ke rekening admin.
     * 3. Client upload bukti transfer (atau langsung konfirmasi via WA).
     * 4. Admin verifikasi → `verified_at` di-set.
     * 5. Booking status berubah jadi `payment_verified`.
     *
     * Catatan:
     * - 1 booking = 1 payment untuk MVP (multi-payment/DP tunda ke versi berikutnya).
     * - Tidak ada payment gateway — semua manual.
     * - `bukti_transfer` path relatif ke `storage/app/public/payment-proofs/`.
     * - ON DELETE CASCADE: kalau booking dihapus, payment ikut terhapus.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings')
                ->cascadeOnDelete();

            // Jumlah yang dibayar (dalam Rupiah)
            $table->decimal('jumlah', 12, 2);

            // Metode pembayaran
            $table->string('metode', 30)->default('transfer_bank');
            // transfer_bank | tunai | lainnya

            // Info bank pengirim (untuk transfer)
            $table->string('bank_pengirim', 100)->nullable();
            $table->string('nama_pengirim')->nullable();

            // Bukti transfer (path file)
            $table->string('bukti_transfer')->nullable();

            // Verifikasi admin
            $table->foreignId('verified_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();

            // Catatan admin (alasan reject, dll)
            $table->text('catatan')->nullable();

            $table->timestamps();

            // Index
            $table->index('booking_id');
            $table->index('verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
