<?php

namespace App\Http\Requests\Client;

use App\Models\Package;
use App\Support\Timezone;
use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    /**
     * Hanya client yang boleh booking.
     */
    public function authorize(): bool
    {
        return $this->user()?->isClient() === true;
    }

    /**
     * Aturan validasi.
     *
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        $package = $this->getPackage();

        // Pengecekan null eksplisit — hindari kombinasi `?->` + `??` dalam satu ekspresi.
        $minPeserta = $package !== null ? $package->min_peserta : 1;
        $maxPeserta = $package !== null ? $package->max_peserta : 1000;

        return [
            // === Info booking ===
            'tanggal_keberangkatan' => [
                'required',
                'date',
                'date_format:Y-m-d',
                'after_or_equal:'.$this->minTanggal($package),
            ],
            'jumlah_peserta' => [
                'required',
                'integer',
                'min:'.$minPeserta,
                'max:'.$maxPeserta,
            ],
            'catatan' => ['nullable', 'string', 'max:2000'],

            // === Participants ===
            'participants' => ['required', 'array', 'min:1'],
            'participants.*.nama' => ['required', 'string', 'min:2', 'max:255'],
            'participants.*.umur' => ['nullable', 'integer', 'min:1', 'max:120'],
            'participants.*.no_hp' => ['nullable', 'string', 'max:20'],
            'participants.*.catatan' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Pesan error Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tanggal_keberangkatan.required' => 'Tanggal keberangkatan wajib diisi.',
            'tanggal_keberangkatan.date' => 'Tanggal keberangkatan tidak valid.',
            'tanggal_keberangkatan.date_format' => 'Format tanggal harus YYYY-MM-DD.',
            'tanggal_keberangkatan.after_or_equal' => 'Tanggal keberangkatan minimal H+3 dari hari ini.',

            'jumlah_peserta.required' => 'Jumlah peserta wajib diisi.',
            'jumlah_peserta.integer' => 'Jumlah peserta harus berupa angka.',
            'jumlah_peserta.min' => 'Jumlah peserta kurang dari minimal paket.',
            'jumlah_peserta.max' => 'Jumlah peserta melebihi maksimal paket.',

            'catatan.max' => 'Catatan maksimal 2000 karakter.',

            'participants.required' => 'Data peserta wajib diisi.',
            'participants.array' => 'Data peserta tidak valid.',
            'participants.min' => 'Minimal 1 peserta harus diisi.',
            'participants.*.nama.required' => 'Nama peserta wajib diisi.',
            'participants.*.nama.min' => 'Nama peserta minimal 2 karakter.',
            'participants.*.nama.max' => 'Nama peserta maksimal 255 karakter.',
            'participants.*.umur.integer' => 'Umur harus berupa angka.',
            'participants.*.umur.min' => 'Umur minimal 1 tahun.',
            'participants.*.umur.max' => 'Umur maksimal 120 tahun.',
            'participants.*.no_hp.max' => 'No. HP maksimal 20 karakter.',
            'participants.*.catatan.max' => 'Catatan peserta maksimal 500 karakter.',
        ];
    }

    /**
     * Attribute names untuk pesan error yang lebih humanis.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'tanggal_keberangkatan' => 'tanggal keberangkatan',
            'jumlah_peserta' => 'jumlah peserta',
            'catatan' => 'catatan',
            'participants' => 'data peserta',
            'participants.*.nama' => 'nama peserta',
            'participants.*.umur' => 'umur peserta',
            'participants.*.no_hp' => 'no. HP peserta',
            'participants.*.catatan' => 'catatan peserta',
        ];
    }

    /**
     * Validasi tambahan: jumlah participants harus sesuai jumlah_peserta.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function ($validator): void {
                $jumlahPeserta = (int) $this->input('jumlah_peserta', 0);
                $participants = $this->input('participants', []);

                if (count($participants) !== $jumlahPeserta) {
                    $validator->errors()->add(
                        'participants',
                        "Data peserta harus sesuai jumlah peserta ({$jumlahPeserta} orang). ".
                        'Saat ini: '.count($participants).' data.'
                    );
                }
            },
        ];
    }

    /**
     * Ambil Package dari route.
     */
    protected function getPackage(): ?Package
    {
        $package = $this->route('package');

        return $package instanceof Package ? $package : null;
    }

    /**
     * Hitung tanggal minimal (H+3 dari timezone package).
     */
    protected function minTanggal(?Package $package): string
    {
        if ($package === null) {
            return now()->addDays(3)->format('Y-m-d');
        }

        return Timezone::today($package->timezone)
            ->addDays(3)
            ->format('Y-m-d');
    }
}
