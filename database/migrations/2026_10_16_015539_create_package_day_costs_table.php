<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_day_costs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('package_day_id')
                ->constrained('package_days')
                ->cascadeOnDelete();

            $table->string('nama_biaya');
            $table->string('kategori', 30);
            $table->decimal('jumlah', 12, 2);
            $table->string('satuan', 20)->default('total');
            $table->text('catatan')->nullable();

            $table->timestamps();

            $table->index('package_day_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_day_costs');
    }
};
