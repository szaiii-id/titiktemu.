<?php

namespace App\Http\Requests\Admin;

use App\Enums\PackageKategori;
use App\Support\Timezone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePackageRequest extends FormRequest
{
    /**
     * Hanya admin yang boleh update paket.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * Aturan validasi.
     *
     * Catatan:
     * - `nama` required sama seperti Store — karena form edit
     *   selalu kirim semua field (bukan partial update).
     * - `cover_image` opsional — kalau tidak diupload, tetap pakai
     *   yang lama (Service handle).
     *
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            // === Identitas ===
            'nama' => ['required', 'string', 'min:3', 'max:255'],
            'deskripsi' => ['nullable', 'string', 'max:5000'],

            // === Kategori ===
            'kategori' => [
                'required',
                'string',
                Rule::in(PackageKategori::values()),
            ],

            // === Durasi ===
            'durasi_hari' => ['required', 'integer', 'min:1', 'max:30'],
            'durasi_malam' => ['required', 'integer', 'min:0', 'max:29'],

            // === Harga ===
            'harga_per_orang' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'harga_per_rombongan' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],

            // === Peserta ===
            'min_peserta' => ['required', 'integer', 'min:1', 'max:1000'],
            'max_peserta' => ['required', 'integer', 'min:1', 'max:1000'],

            // === Timezone ===
            'timezone' => [
                'required',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! Timezone::isValid($value)) {
                        $fail('Timezone tidak valid. Pilih dari daftar yang tersedia.');
                    }
                },
            ],

            // === Media ===
            // Opsional: kalau tidak diupload, cover lama tetap dipakai.
            'cover_image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048', // 2 MB
            ],
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
            // Nama
            'nama.required' => 'Nama paket wajib diisi.',
            'nama.string' => 'Nama paket harus berupa teks.',
            'nama.min' => 'Nama paket minimal 3 karakter.',
            'nama.max' => 'Nama paket maksimal 255 karakter.',

            // Deskripsi
            'deskripsi.max' => 'Deskripsi maksimal 5000 karakter.',

            // Kategori
            'kategori.required' => 'Kategori wajib dipilih.',
            'kategori.in' => 'Kategori tidak valid.',

            // Durasi
            'durasi_hari.required' => 'Durasi hari wajib diisi.',
            'durasi_hari.integer' => 'Durasi hari harus berupa angka.',
            'durasi_hari.min' => 'Durasi hari minimal 1.',
            'durasi_hari.max' => 'Durasi hari maksimal 30.',
            'durasi_malam.required' => 'Durasi malam wajib diisi.',
            'durasi_malam.integer' => 'Durasi malam harus berupa angka.',
            'durasi_malam.min' => 'Durasi malam tidak boleh negatif.',
            'durasi_malam.max' => 'Durasi malam maksimal 29.',

            // Harga
            'harga_per_orang.required' => 'Harga per orang wajib diisi.',
            'harga_per_orang.numeric' => 'Harga per orang harus berupa angka.',
            'harga_per_orang.min' => 'Harga per orang tidak boleh negatif.',
            'harga_per_orang.max' => 'Harga per orang terlalu besar.',
            'harga_per_rombongan.numeric' => 'Harga per rombongan harus berupa angka.',
            'harga_per_rombongan.min' => 'Harga per rombongan tidak boleh negatif.',
            'harga_per_rombongan.max' => 'Harga per rombongan terlalu besar.',

            // Peserta
            'min_peserta.required' => 'Minimal peserta wajib diisi.',
            'min_peserta.integer' => 'Minimal peserta harus berupa angka.',
            'min_peserta.min' => 'Minimal peserta minimal 1.',
            'min_peserta.max' => 'Minimal peserta maksimal 1000.',
            'max_peserta.required' => 'Maksimal peserta wajib diisi.',
            'max_peserta.integer' => 'Maksimal peserta harus berupa angka.',
            'max_peserta.min' => 'Maksimal peserta minimal 1.',
            'max_peserta.max' => 'Maksimal peserta maksimal 1000.',

            // Timezone
            'timezone.required' => 'Timezone wajib dipilih.',
            'timezone.max' => 'Timezone terlalu panjang.',

            // Cover
            'cover_image.image' => 'Cover harus berupa file gambar.',
            'cover_image.mimes' => 'Cover harus berformat JPG, JPEG, PNG, atau WEBP.',
            'cover_image.max' => 'Ukuran cover maksimal 2 MB.',
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
            'nama' => 'nama paket',
            'deskripsi' => 'deskripsi',
            'kategori' => 'kategori',
            'durasi_hari' => 'durasi hari',
            'durasi_malam' => 'durasi malam',
            'harga_per_orang' => 'harga per orang',
            'harga_per_rombongan' => 'harga per rombongan',
            'min_peserta' => 'minimal peserta',
            'max_peserta' => 'maksimal peserta',
            'timezone' => 'timezone',
            'cover_image' => 'cover',
        ];
    }
}
