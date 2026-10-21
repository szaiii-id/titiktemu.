<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePackageDayRequest extends FormRequest
{
    /**
     * Hanya admin yang boleh menambah hari ke paket.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * Aturan validasi.
     *
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'judul' => ['required', 'string', 'min:3', 'max:255'],
            'deskripsi' => ['nullable', 'string', 'max:5000'],
            'jam_mulai' => ['nullable', 'date_format:H:i'],
            'jam_selesai' => ['nullable', 'date_format:H:i', 'after_or_equal:jam_mulai'],
            'lokasi' => ['nullable', 'string', 'max:255'],
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
            'judul.required' => 'Judul hari wajib diisi.',
            'judul.min' => 'Judul hari minimal 3 karakter.',
            'judul.max' => 'Judul hari maksimal 255 karakter.',
            'deskripsi.max' => 'Deskripsi maksimal 5000 karakter.',
            'jam_mulai.date_format' => 'Format jam mulai harus HH:MM.',
            'jam_selesai.date_format' => 'Format jam selesai harus HH:MM.',
            'jam_selesai.after_or_equal' => 'Jam selesai harus setelah atau sama dengan jam mulai.',
            'lokasi.max' => 'Lokasi maksimal 255 karakter.',
        ];
    }

    /**
     * Attribute names untuk pesan error yang humanis.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'judul' => 'judul hari',
            'deskripsi' => 'deskripsi',
            'jam_mulai' => 'jam mulai',
            'jam_selesai' => 'jam selesai',
            'lokasi' => 'lokasi',
        ];
    }
}
