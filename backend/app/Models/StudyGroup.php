<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class StudyGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'invite_code',
        'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    public static function generateInviteCode(): string
    {
        do {
            $code = 'LAB-' . strtoupper(Str::random(4)) . rand(10, 99);
        } while (self::where('invite_code', $code)->exists());

        return $code;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(StudyGroupMember::class, 'study_group_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'study_group_members', 'study_group_id', 'user_id')
            ->withPivot(['member_role', 'joined_at'])
            ->withTimestamps();
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(CircuitScenario::class, 'study_group_id');
    }

    public function customComponents(): HasMany
    {
        return $this->hasMany(CustomComponent::class, 'study_group_id');
    }

    public function hasMember(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($this->owner_id === $user->id) {
            return true;
        }

        return $this->memberships()->where('user_id', $user->id)->exists();
    }
}
