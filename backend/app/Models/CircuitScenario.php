<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CircuitScenario extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'study_group_id',
        'remixed_from_id',
        'title',
        'slug',
        'summary',
        'board_type',
        'visibility',
        'scenario_data',
        'forks_count',
    ];

    protected $casts = [
        'scenario_data' => 'array',
        'forks_count' => 'integer',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function studyGroup(): BelongsTo
    {
        return $this->belongsTo(StudyGroup::class, 'study_group_id');
    }

    public function remixedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'remixed_from_id');
    }

    public function forks(): HasMany
    {
        return $this->hasMany(self::class, 'remixed_from_id');
    }
}
