<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mitra_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mitra_id')->unique()->constrained('users')->restrictOnDelete();
            $table->decimal('saldo', 12, 2)->default(0);
            $table->decimal('total_pendapatan', 12, 2)->default(0);
            $table->decimal('total_dicairkan', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra_wallets');
    }
};
