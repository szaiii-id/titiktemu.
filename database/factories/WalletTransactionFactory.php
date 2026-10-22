<?php

namespace Database\Factories;

use App\Enums\WalletTransactionCategory;
use App\Enums\WalletTransactionType;
use App\Models\MitraWallet;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<WalletTransaction> */
class WalletTransactionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'wallet_id' => MitraWallet::factory(),
            'tipe' => WalletTransactionType::CREDIT->value,
            'jumlah' => fake()->numberBetween(500_000, 5_000_000),
            'saldo_setelah' => fake()->numberBetween(500_000, 10_000_000),
            'kategori' => WalletTransactionCategory::HONOR_TRIP->value,
            'referensi_type' => null,
            'referensi_id' => null,
            'deskripsi' => 'Test transaction',
        ];
    }
}
