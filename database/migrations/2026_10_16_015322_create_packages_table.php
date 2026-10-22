<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();

            $table->string('kode', 50)->unique();
            $table->string('nama');
            $table->string('slug')->unique();

            $table->text('deskripsi')->nullable();
            $table->string('kategori', 30);

            $table->unsignedSmallInteger('durasi_hari');
            $table->unsignedSmallInteger('durasi_malam');

            $table->decimal('harga_per_orang', 12, 2);
            $table->decimal('harga_per_rombongan', 12, 2)->nullable();

            $table->unsignedSmallInteger('min_peserta')->default(1);
            $table->unsignedSmallInteger('max_peserta')->default(20);

            $table->string('timezone', 50)->default('Asia/Makassar');

            $table->string('cover_image')->nullable();

            $table->string('status', 20)->default('draft');

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('kategori');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
