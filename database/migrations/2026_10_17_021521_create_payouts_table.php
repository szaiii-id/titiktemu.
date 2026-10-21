<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 50)->unique();
            $table->foreignId('mitra_id')->constrained('users')->restrictOnDelete();
            $table->decimal('jumlah', 12, 2);
            $table->string('bank_tujuan', 100);
            $table->string('no_rekening', 50);
            $table->string('nama_pemilik', 255);
            $table->string('status', 20)->default('pending');
            $table->timestamp('requested_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->index('status');
            $table->index('mitra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payouts');
    }
};
