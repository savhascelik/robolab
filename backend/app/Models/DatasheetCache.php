<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DatasheetCache extends Model
{
    use HasFactory;

    protected $fillable = [
        'part_key',
        'query_text',
        'tavily_results',
        'synthesized_schema',
        'source_url',
        'hits_count',
        'expires_at',
    ];

    protected $casts = [
        'tavily_results' => 'array',
        'synthesized_schema' => 'array',
        'hits_count' => 'integer',
        'expires_at' => 'datetime',
    ];

    public static function normalizePartKey(string $rawPart): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', trim($rawPart)) ?: 'UNKNOWN');
    }
}
