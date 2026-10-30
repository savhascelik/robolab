<?php

namespace App\Services;

use App\Models\AiModel;
use App\Models\CustomComponent;
use App\Models\DatasheetCache;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class TavilyDatasheetService
{
    public function __construct(
        private readonly AiGatewayService $aiGateway
    ) {
    }

    /**
     * Fetch datasheet specs (from persistent DB cache first, then Tavily API)
     * and synthesize a 3D CustomComponent schema.
     */
    public function synthesizeComponentFromDatasheet(
        string $partNumber,
        ?User $user = null,
        array $options = []
    ): array {
        $partKey = DatasheetCache::normalizePartKey($partNumber);
        $forceRefresh = (bool) ($options['force_refresh'] ?? false);

        $cached = DatasheetCache::where('part_key', $partKey)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($cached && ! $forceRefresh && ! empty($cached->synthesized_schema)) {
            $cached->increment('hits_count');

            return [
                'part_key' => $partKey,
                'cache_hit' => true,
                'hits_count' => $cached->fresh()->hits_count,
                'source_url' => $cached->source_url,
                'tavily_results' => $cached->tavily_results,
                'component_schema' => $cached->synthesized_schema,
            ];
        }

        // Reuse cached Tavily web snippets if available; otherwise query Tavily API
        $queryText = "{$partKey} sensor module pinout voltage electrical characteristics datasheet";
        if ($cached && ! $forceRefresh && ! empty($cached->tavily_results)) {
            $results = $cached->tavily_results;
            $tavilyPayload = ['results' => $results];
            $primaryUrl = $cached->source_url ?: data_get($results, '0.url');
        } else {
            $tavilyKey = trim((string) ($options['byok_tavily_key'] ?? config('ai.tavily.api_key', '')));
            $tavilyBaseUrl = rtrim((string) config('ai.tavily.base_url', 'https://api.tavily.com'), '/');

            $tavilyResp = Http::timeout(25)->post($tavilyBaseUrl . '/search', [
                'api_key' => $tavilyKey,
                'query' => $queryText,
                'search_depth' => 'advanced',
                'include_answer' => true,
                'max_results' => 4,
            ]);

            if ($tavilyResp->failed()) {
                throw new RuntimeException(
                    'Tavily datasheet search failed with status ' . $tavilyResp->status(),
                    502
                );
            }

            $tavilyPayload = $tavilyResp->json() ?? [];
            $results = $tavilyPayload['results'] ?? [];
            $primaryUrl = data_get($results, '0.url');
        }

        // Synthesize 3D Component Schema via active 'datasheet_synth' AI Model
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are an embedded hardware datasheet synthesizer. Return ONLY valid JSON with keys: part_number, name, category, pinout, electrical_specs, internal_dipoles, mesh_recipe.',
            ],
            [
                'role' => 'user',
                'content' => "Synthesize a 3D hardware component schema for part [{$partKey}] using these Tavily datasheet findings:\n"
                    . json_encode($tavilyPayload, JSON_UNESCAPED_UNICODE),
            ],
        ];

        $aiResult = $this->aiGateway->chat(
            AiModel::ROLE_DATASHEET_SYNTH,
            $messages,
            $user,
            $options
        );

        $synthesizedSchema = $aiResult['decoded_json'] ?? [
            'part_number' => $partKey,
            'name' => $partKey . ' Hardware Module',
            'category' => 'sensor',
            'pinout' => [
                ['name' => 'VCC', 'type' => 'power', 'voltage' => 3.3],
                ['name' => 'GND', 'type' => 'ground'],
                ['name' => 'OUT', 'type' => 'signal'],
            ],
            'electrical_specs' => ['vcc_min' => 3.0, 'vcc_max' => 5.5],
            'internal_dipoles' => [['between' => ['VCC', 'GND'], 'resistance_ohms' => 50000]],
            'mesh_recipe' => ['pcb_color' => '#1e3a8a', 'width_mm' => 14, 'length_mm' => 18],
        ];

        $ttlHours = (int) config('ai.tavily.cache_ttl_hours', 720);
        $cacheRecord = DatasheetCache::updateOrCreate(
            ['part_key' => $partKey],
            [
                'query_text' => $queryText,
                'tavily_results' => $results,
                'synthesized_schema' => $synthesizedSchema,
                'source_url' => $primaryUrl,
                'hits_count' => 1,
                'expires_at' => now()->addHours($ttlHours),
            ]
        );

        if ($user) {
            CustomComponent::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'part_number' => $partKey,
                ],
                [
                    'name' => $synthesizedSchema['name'] ?? ($partKey . ' Module'),
                    'slug' => strtolower($partKey) . '-' . strtolower(Str::random(5)),
                    'category' => $synthesizedSchema['category'] ?? 'sensor',
                    'visibility' => 'public',
                    'pinout' => $synthesizedSchema['pinout'] ?? [],
                    'electrical_specs' => $synthesizedSchema['electrical_specs'] ?? [],
                    'internal_dipoles' => $synthesizedSchema['internal_dipoles'] ?? [],
                    'mesh_recipe' => $synthesizedSchema['mesh_recipe'] ?? [],
                    'datasheet_url' => $primaryUrl,
                ]
            );
        }

        return [
            'part_key' => $partKey,
            'cache_hit' => false,
            'hits_count' => $cacheRecord->hits_count,
            'source_url' => $primaryUrl,
            'tavily_results' => $results,
            'component_schema' => $synthesizedSchema,
            'ai_meta' => [
                'provider_slug' => $aiResult['provider_slug'],
                'model_id' => $aiResult['model_id'],
                'latency_ms' => $aiResult['latency_ms'],
            ],
        ];
    }

    /**
     * Lookup pre-cached datasheet or query Tavily search snippets without coupling AI call.
     */
    public function lookupOrSearch(string $partNumber): array
    {
        $partKey = DatasheetCache::normalizePartKey($partNumber);

        $cached = DatasheetCache::where('part_key', $partKey)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($cached) {
            $cached->increment('hits_count');

            return [
                'part_key' => $partKey,
                'cache_hit' => true,
                'source' => 'database_cache',
                'hits_count' => $cached->fresh()->hits_count,
                'source_url' => $cached->source_url,
                'tavily_results' => $cached->tavily_results ?? [],
                'synthesized_schema' => $cached->synthesized_schema,
            ];
        }

        $tavilyKey = trim((string) config('ai.tavily.api_key', ''));
        $tavilyBaseUrl = rtrim((string) config('ai.tavily.base_url', 'https://api.tavily.com'), '/');
        $queryText = "{$partKey} sensor module pinout voltage electrical characteristics datasheet";

        $results = [];
        if ($tavilyKey !== '') {
            try {
                $tavilyResp = Http::timeout(15)->post($tavilyBaseUrl . '/search', [
                    'api_key' => $tavilyKey,
                    'query' => $queryText,
                    'search_depth' => 'advanced',
                    'include_answer' => true,
                    'max_results' => 4,
                ]);
                if ($tavilyResp->successful()) {
                    $results = $tavilyResp->json('results') ?? [];
                }
            } catch (\Throwable) {
                $results = [];
            }
        }

        $primaryUrl = $results[0]['url'] ?? null;
        if (! empty($results)) {
            $ttlHours = (int) config('ai.tavily.cache_ttl_hours', 720);
            DatasheetCache::updateOrCreate(
                ['part_key' => $partKey],
                [
                    'query_text' => $queryText,
                    'tavily_results' => $results,
                    'synthesized_schema' => null,
                    'source_url' => $primaryUrl,
                    'hits_count' => 1,
                    'expires_at' => now()->addHours($ttlHours),
                ]
            );
        }

        return [
            'part_key' => $partKey,
            'cache_hit' => false,
            'source' => ! empty($results) ? 'tavily_live' : 'deterministic_fallback',
            'hits_count' => 1,
            'source_url' => $primaryUrl,
            'tavily_results' => $results,
            'synthesized_schema' => null,
        ];
    }

    public function saveSynthesizedSchema(string $partKey, array $schema, ?string $sourceUrl = null): DatasheetCache
    {
        $ttlHours = (int) config('ai.tavily.cache_ttl_hours', 720);
        $existing = DatasheetCache::where('part_key', $partKey)->first();

        return DatasheetCache::updateOrCreate(
            ['part_key' => $partKey],
            [
                'query_text' => "{$partKey} sensor module pinout voltage electrical characteristics datasheet",
                'tavily_results' => $existing?->tavily_results ?? [],
                'synthesized_schema' => $schema,
                'source_url' => $sourceUrl ?: $existing?->source_url,
                'hits_count' => max(1, (int) ($existing?->hits_count ?? 1)),
                'expires_at' => now()->addHours($ttlHours),
            ]
        );
    }
}
