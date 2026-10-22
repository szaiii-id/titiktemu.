<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class UserRepository implements UserRepositoryInterface
{
    /**
     * Driver-aware search operator.
     *
     * PostgreSQL → `ilike` (case-insensitive)
     * SQLite/MySQL → `like` (case-insensitive by default)
     */
    protected function searchOperator(): string
    {
        return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }

    /**
     * {@inheritDoc}
     */
    public function findByEmailOrUsername(string $identitas): ?User
    {
        return User::where('email', $identitas)
            ->orWhere('username', $identitas)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function findByGoogleId(string $googleId): ?User
    {
        return User::where('google_id', $googleId)->first();
    }

    /**
     * {@inheritDoc}
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int $id): ?User
    {
        return User::find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function createClient(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'username' => $data['username'] ?? null,
            'email' => $data['email'],
            'password' => $data['password'] ?? null,
            'google_id' => $data['google_id'] ?? null,
            'role' => 'client',
            'must_change_password' => false,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function createUser(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'username' => $data['username'] ?? null,
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'must_change_password' => $data['must_change_password'] ?? true,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function updateUser(User $user, array $data): User
    {
        $user->update($data);

        return $user->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function updatePassword(User $user, string $plainPassword): User
    {
        $user->update([
            'password' => $plainPassword,
            'must_change_password' => false,
        ]);

        return $user->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function deleteUser(User $user): bool
    {
        return (bool) $user->delete();
    }

    /**
     * {@inheritDoc}
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateByRoles(
        array $roles,
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator {
        $operator = $this->searchOperator();

        return User::query()
            ->with('profile')
            ->whereIn('role', $roles)
            ->when($search, function ($query, $search) use ($operator) {
                $query->where(function ($q) use ($search, $operator) {
                    $q->where('name', $operator, "%{$search}%")
                        ->orWhere('email', $operator, "%{$search}%")
                        ->orWhere('username', $operator, "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * {@inheritDoc}
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateClients(
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator {
        $operator = $this->searchOperator();

        return User::query()
            ->with('profile')
            ->where('role', 'client')
            ->when($search, function ($query, $search) use ($operator) {
                $query->where(function ($q) use ($search, $operator) {
                    $q->where('name', $operator, "%{$search}%")
                        ->orWhere('email', $operator, "%{$search}%")
                        ->orWhere('username', $operator, "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * {@inheritDoc}
     */
    public function emailExists(string $email, ?int $exceptUserId = null): bool
    {
        return User::where('email', $email)
            ->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     */
    public function usernameExists(string $username, ?int $exceptUserId = null): bool
    {
        return User::where('username', $username)
            ->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     */
    public function searchByRole(string $role, string $search, int $limit = 10): Collection
    {
        $operator = $this->searchOperator();

        return User::query()
            ->where('role', $role)
            ->when($search, function ($query, $search) use ($operator) {
                $query->where(function ($q) use ($search, $operator) {
                    $q->where('name', $operator, "%{$search}%")
                        ->orWhere('email', $operator, "%{$search}%")
                        ->orWhere('username', $operator, "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'email', 'username']);
    }
}
