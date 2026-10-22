<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_days', function (Blueprint $table) {
            $table->id();

            $table->foreignId('package_id')
                ->constrained('packages')
                ->cascadeOnDelete();

            $table->unsignedSmallInteger('hari_ke');

            $table->string('judul');
            $table->text('deskripsi')->nullable();

            $table->time('jam_mulai')->nullable();
            $table->time('jam_selesai')->nullable();

            $table->string('lokasi')->nullable();

            $table->timestamps();

            $table->unique(['package_id', 'hari_ke']);
            $table->index(['package_id', 'hari_ke']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_days');
    }
};
