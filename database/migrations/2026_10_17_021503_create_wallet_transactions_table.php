<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('mitra_wallets')->cascadeOnDelete();
            $table->string('tipe', 20); // credit | debit
            $table->decimal('jumlah', 12, 2);
            $table->decimal('saldo_setelah', 12, 2);
            $table->string('kategori', 30); // honor_trip | payout | adjustment | refund
            $table->string('referensi_type', 100)->nullable();
            $table->bigInteger('referensi_id')->nullable();
            $table->string('deskripsi');
            $table->timestamps();
            $table->index('wallet_id');
            $table->index('kategori');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
