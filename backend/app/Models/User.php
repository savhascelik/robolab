<?php

namespace App\Models;

use App\Services\LimitService;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * Force Spatie Permission to resolve the 'web' guard even when authenticated via Sanctum API tokens.
     */
    protected string $guard_name = 'web';

    protected static function booted(): void
    {
        static::created(function (self $user) {
            try {
                if ($user->roles()->count() === 0 && Role::where('name', 'free')->where('guard_name', 'web')->exists()) {
                    $user->assignRole('free');
                }
            } catch (\Throwable) {
                // Ignore if roles table is not migrated yet
            }
        });
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->hasRole('admin');
    }

    protected $fillable = [
        'name',
        'email',
        'password',
        'settings',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'settings' => 'array',
        ];
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(CircuitScenario::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function allowedBoards(): array
    {
        return ['arduino_uno', 'esp32_devkit', 'jetson_nano_2gb'];
    }

    public function ownedGroups(): HasMany
    {
        return $this->hasMany(StudyGroup::class, 'owner_id');
    }

    public function studyGroups(): BelongsToMany
    {
        return $this->belongsToMany(StudyGroup::class, 'study_group_members')
            ->withPivot(['member_role', 'joined_at'])
            ->withTimestamps();
    }

    public function customComponents(): HasMany
    {
        return $this->hasMany(CustomComponent::class);
    }

    public function aiUsageLogs(): HasMany
    {
        return $this->hasMany(AiUsageLog::class);
    }

    public function creditBalance(): HasOne
    {
        return $this->hasOne(AiCreditBalance::class);
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(AiCreditTransaction::class);
    }

    public function creditUsages(): HasMany
    {
        return $this->hasMany(AiCreditUsage::class);
    }

    public function creditOrders(): HasMany
    {
        return $this->hasMany(AiCreditOrder::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->where('status', 'active')
            ->latestOfMany();
    }

    /**
     * Ensure user has a credit balance record and receives their initial role credit grant once.
     */
    public function ensureInitialCreditGrant(): AiCreditBalance
    {
        $balance = AiCreditBalance::getOrCreateForUser($this->id);

        if ((float) $balance->total_earned_promotional <= 0) {
            /** @var LimitService $limitService */
            $limitService = app(LimitService::class);
            $initialGrant = $limitService->getUserLimit(
                $this,
                RoleLimit::RESOURCE_AI_USAGE,
                'initial_credit_balance'
            );

            if ($initialGrant <= 0) {
                $initialGrant = 250;
            }

            $roleName = $this->getRoleNames()->first() ?? 'free';

            $balance->addPromotionalCredits(
                (float) $initialGrant,
                'signup_grant',
                "Initial AI Credit grant for role '{$roleName}' ({$initialGrant} credits)",
                'role_limit',
                null,
                ['role' => $roleName, 'initial_credit_balance' => $initialGrant]
            );
        }

        return $balance->fresh();
    }
}
