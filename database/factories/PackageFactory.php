<?php

namespace Database\Factories;

use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use App\Models\PackageFacility;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Package>
 */
class PackageFactory extends Factory
{
    public function definition(): array
    {
        $nama = fake()->unique()->sentence(3);
        $durasiHari = fake()->numberBetween(1, 5);
        $durasiMalam = max(0, $durasiHari - 1);

        return [
            'kode' => 'PKG-'.now()->year.'-'.str_pad(
                (string) fake()->unique()->numberBetween(1, 999),
                3,
                '0',
                STR_PAD_LEFT
            ),
            'nama' => $nama,
            'slug' => Str::slug($nama).'-'.fake()->unique()->numberBetween(1, 9999),
            'deskripsi' => fake()->paragraph(),
            'kategori' => fake()->randomElement(PackageKategori::values()),
            'durasi_hari' => $durasiHari,
            'durasi_malam' => $durasiMalam,
            'harga_per_orang' => fake()->numberBetween(300_000, 3_000_000),
            'harga_per_rombongan' => null,
            'min_peserta' => 1,
            'max_peserta' => fake()->numberBetween(10, 30),
            'timezone' => User::DEFAULT_TIMEZONE,
            'cover_image' => null,
            'status' => PackageStatus::DRAFT->value,
            'created_by' => User::factory()->admin(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PackageStatus::DRAFT->value,
        ]);
    }

    public function aktif(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PackageStatus::AKTIF->value,
        ]);
    }

    public function arsip(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PackageStatus::ARSIP->value,
        ]);
    }

    public function duaHari(): static
    {
        return $this->state(fn (array $attributes) => [
            'durasi_hari' => 2,
            'durasi_malam' => 1,
        ]);
    }

    public function tigaHari(): static
    {
        return $this->state(fn (array $attributes) => [
            'durasi_hari' => 3,
            'durasi_malam' => 2,
        ]);
    }

    public function timezone(string $tz): static
    {
        return $this->state(fn (array $attributes) => [
            'timezone' => $tz,
        ]);
    }

    public function createdBy(User $admin): static
    {
        return $this->state(fn (array $attributes) => [
            'created_by' => $admin->id,
        ]);
    }

    public function lengkap(): static
    {
        return $this->afterCreating(function (Package $package) {
            for ($i = 1; $i <= $package->durasi_hari; $i++) {
                $day = PackageDay::factory()->create([
                    'package_id' => $package->id,
                    'hari_ke' => $i,
                ]);

                PackageDayCost::factory()
                    ->count(fake()->numberBetween(2, 3))
                    ->create(['package_day_id' => $day->id]);
            }

            PackageFacility::factory()
                ->count(3)
                ->include()
                ->create(['package_id' => $package->id]);

            PackageFacility::factory()
                ->count(2)
                ->exclude()
                ->create(['package_id' => $package->id]);
        });
    }
}
