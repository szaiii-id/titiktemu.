<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('e_tickets', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('qr_code');
            $table->string('pdf_path');
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
            $table->index('booking_id');
            $table->index('trip_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('e_tickets');
    }
};
