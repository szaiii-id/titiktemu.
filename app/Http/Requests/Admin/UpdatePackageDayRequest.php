<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePackageDayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
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
}
