<?php

namespace Database\Factories;

use App\Models\MitraWallet;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MitraWallet>
 */
class MitraWalletFactory extends Factory
{
    public function definition(): array
    {
        return [
            'mitra_id' => User::factory()->mitra(),
            'saldo' => 0,
            'total_pendapatan' => 0,
            'total_dicairkan' => 0,
        ];
    }

    public function withSaldo(float $saldo): static
    {
        return $this->state(fn () => [
            'saldo' => $saldo,
        ]);
    }
}
