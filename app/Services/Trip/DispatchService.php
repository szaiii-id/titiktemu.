<?php

namespace App\Services\Trip;

use App\Enums\TripMitraRole;
use App\Enums\TripStatus;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Support\TripHonorTipe;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DispatchService
{
    /**
     * Assign mitra ke trip.
     *
     * @param  array{
     *     mitra_id: int,
     *     role?: string,
     *     honor: float|int,
     *     honor_tipe?: string,
     *     instruksi?: string|null
     * }  $data
     */
    public function assignMitra(Trip $trip, array $data, User $admin): TripMitra
    {
        if (! $trip->canAssignMitra()) {
            throw ValidationException::withMessages([
                'status' => ['Trip ini sudah selesai atau dibatalkan, tidak bisa assign mitra.'],
            ]);
        }

        $mitra = User::find((int) $data['mitra_id']);

        if (! $mitra) {
            throw ValidationException::withMessages([
                'mitra_id' => ['Mitra tidak ditemukan.'],
            ]);
        }

        if (! $mitra->isMitra()) {
            throw ValidationException::withMessages([
                'mitra_id' => ['User yang dipilih bukan mitra.'],
            ]);
        }

        $exists = TripMitra::where('trip_id', $trip->id)
            ->where('mitra_id', $mitra->id)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'mitra_id' => ['Mitra ini sudah di-assign ke trip ini.'],
            ]);
        }

        $role = (string) ($data['role'] ?? TripMitraRole::LEAD->value);
        if (! in_array($role, TripMitraRole::values(), true)) {
            throw ValidationException::withMessages([
                'role' => ['Role mitra tidak valid.'],
            ]);
        }

        $honorTipe = (string) ($data['honor_tipe'] ?? TripHonorTipe::FLAT);
        if (! TripHonorTipe::isValid($honorTipe)) {
            throw ValidationException::withMessages([
                'honor_tipe' => ['Tipe honor tidak valid.'],
            ]);
        }

        $honor = (float) $data['honor'];
        if ($honor <= 0) {
            throw ValidationException::withMessages([
                'honor' => ['Honor harus lebih dari 0.'],
            ]);
        }

        return DB::transaction(function () use ($trip, $mitra, $data, $role, $honorTipe, $honor, $admin) {
            $tripMitra = TripMitra::create([
                'trip_id' => $trip->id,
                'mitra_id' => $mitra->id,
                'role' => $role,
                'honor' => $honor,
                'honor_tipe' => $honorTipe,
                'instruksi' => $data['instruksi'] ?? null,
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
            ]);

            Log::info('Mitra di-assign ke trip', [
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
                'mitra_id' => $mitra->id,
                'mitra_name' => $mitra->name,
                'role' => $role,
                'honor' => $honor,
                'honor_tipe' => $honorTipe,
                'assigned_by' => $admin->id,
            ]);

            return $tripMitra->load(['mitra', 'assigner']);
        });
    }

    /**
     * @param  array{
     *     role?: string,
     *     honor?: float|int,
     *     honor_tipe?: string,
     *     instruksi?: string|null
     * }  $data
     */
    public function updateAssignment(TripMitra $tripMitra, array $data): TripMitra
    {
        $trip = $tripMitra->trip;

        if (! $trip) {
            throw ValidationException::withMessages([
                'trip' => ['Trip tidak ditemukan.'],
            ]);
        }

        if (! $trip->canAssignMitra()) {
            throw ValidationException::withMessages([
                'status' => ['Trip sudah selesai atau dibatalkan, tidak bisa update assignment.'],
            ]);
        }

        /** @var array<string, mixed> $updateData */
        $updateData = [];

        if (isset($data['role'])) {
            $role = (string) $data['role'];
            if (! in_array($role, TripMitraRole::values(), true)) {
                throw ValidationException::withMessages([
                    'role' => ['Role mitra tidak valid.'],
                ]);
            }
            $updateData['role'] = $role;
        }

        if (isset($data['honor'])) {
            $honor = (float) $data['honor'];
            if ($honor <= 0) {
                throw ValidationException::withMessages([
                    'honor' => ['Honor harus lebih dari 0.'],
                ]);
            }
            $updateData['honor'] = $honor;
        }

        if (isset($data['honor_tipe'])) {
            $honorTipe = (string) $data['honor_tipe'];
            if (! TripHonorTipe::isValid($honorTipe)) {
                throw ValidationException::withMessages([
                    'honor_tipe' => ['Tipe honor tidak valid.'],
                ]);
            }
            $updateData['honor_tipe'] = $honorTipe;
        }

        if (array_key_exists('instruksi', $data)) {
            $updateData['instruksi'] = $data['instruksi'];
        }

        return DB::transaction(function () use ($tripMitra, $updateData) {
            $tripMitra->update($updateData);

            Log::info('Assignment mitra diupdate', [
                'trip_mitra_id' => $tripMitra->id,
                'trip_id' => $tripMitra->trip_id,
                'mitra_id' => $tripMitra->mitra_id,
                'updated_fields' => array_keys($updateData),
            ]);

            return $tripMitra->refresh()->load(['mitra', 'assigner']);
        });
    }

    public function unassignMitra(TripMitra $tripMitra): void
    {
        $trip = $tripMitra->trip;

        if (! $trip) {
            throw ValidationException::withMessages([
                'trip' => ['Trip tidak ditemukan.'],
            ]);
        }

        if (! $trip->canAssignMitra()) {
            throw ValidationException::withMessages([
                'status' => ['Trip sudah selesai atau dibatalkan, tidak bisa unassign mitra.'],
            ]);
        }

        if ($trip->status === TripStatus::ACTIVE) {
            $mitraCount = TripMitra::where('trip_id', $trip->id)->count();

            if ($mitraCount <= 1) {
                throw ValidationException::withMessages([
                    'status' => ['Trip yang sedang berjalan harus punya minimal 1 mitra.'],
                ]);
            }
        }

        DB::transaction(function () use ($tripMitra, $trip) {
            Log::warning('Mitra di-unassign dari trip', [
                'trip_mitra_id' => $tripMitra->id,
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
                'mitra_id' => $tripMitra->mitra_id,
            ]);

            $tripMitra->delete();
        });
    }

    /**
     * Ambil total honor semua mitra di trip.
     */
    public function totalHonorForTrip(Trip $trip): float
    {
        $trip->loadMissing('mitras');

        $total = 0.0;
        $durasiHari = $trip->durasiHari();

        foreach ($trip->mitras as $mitra) {
            $total += $mitra->hitungHonorTotal($durasiHari);
        }

        return $total;
    }

    /**
     * @return Collection<int, User>
     */
    public function searchMitras(string $search, int $limit = 10): Collection
    {
        return app(UserRepositoryInterface::class)
            ->searchByRole('mitra', $search, $limit);
    }
}
