<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'study_group_id',
        'part_number',
        'name',
        'slug',
        'category',
        'visibility',
        'pinout',
        'electrical_specs',
        'internal_dipoles',
        'mesh_recipe',
        'datasheet_url',
    ];

    protected $casts = [
        'pinout' => 'array',
        'electrical_specs' => 'array',
        'internal_dipoles' => 'array',
        'mesh_recipe' => 'array',
    ];

    protected $appends = [
        'type_id',
        'is_environment_prop',
        'manifest_json',
    ];

    public function getTypeIdAttribute(): string
    {
        $spec = is_array($this->mesh_recipe) ? ($this->mesh_recipe['v2_spec'] ?? $this->mesh_recipe) : [];
        if (!empty($spec['typeId']) && is_string($spec['typeId'])) {
            return $spec['typeId'];
        }
        $elec = is_array($this->electrical_specs) ? $this->electrical_specs : [];
        if (!empty($elec['typeId']) && is_string($elec['typeId'])) {
            return $elec['typeId'];
        }
        $cleanPart = strtolower(preg_replace('/[^a-zA-Z0-9_]+/', '_', (string) $this->part_number));
        return 'custom.' . ($cleanPart ?: 'module_' . $this->id);
    }

    public function getIsEnvironmentPropAttribute(): bool
    {
        $spec = is_array($this->mesh_recipe) ? ($this->mesh_recipe['v2_spec'] ?? $this->mesh_recipe) : [];
        if (array_key_exists('isEnvironmentProp', $spec)) {
            return (bool) $spec['isEnvironmentProp'];
        }
        $elec = is_array($this->electrical_specs) ? $this->electrical_specs : [];
        return (bool) ($elec['isEnvironmentProp'] ?? ($this->category === 'props'));
    }

    public function getManifestJsonAttribute(): array
    {
        $mesh = is_array($this->mesh_recipe) ? $this->mesh_recipe : [];
        $elec = is_array($this->electrical_specs) ? $this->electrical_specs : [];
        $v2 = isset($mesh['v2_spec']) && is_array($mesh['v2_spec']) ? $mesh['v2_spec'] : $mesh;

        return array_merge([
            'typeId' => $this->type_id,
            'name' => $this->name,
            'category' => $this->category ?: 'custom',
            'isEnvironmentProp' => $this->is_environment_prop,
            'pins' => is_array($this->pinout) ? $this->pinout : [],
            'dipoles' => is_array($this->internal_dipoles) ? $this->internal_dipoles : [],
            'parts' => isset($v2['parts']) && is_array($v2['parts']) ? $v2['parts'] : [],
            'dimensions' => $v2['dimensions'] ?? ['width' => 14, 'height' => 1.6, 'depth' => 11],
            'pcbColor' => $v2['pcbColor'] ?? 0x065f46,
            'evaluateScript' => $v2['evaluateScript'] ?? ($elec['evaluateScript'] ?? null),
            'obstacleProfile' => $v2['obstacleProfile'] ?? ($elec['obstacleProfile'] ?? null),
        ], is_array($v2) ? $v2 : []);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function studyGroup(): BelongsTo
    {
        return $this->belongsTo(StudyGroup::class, 'study_group_id');
    }
}
