<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomComponent;
use App\Models\RoleLimit;
use App\Models\StudyGroupMember;
use App\Models\User;
use App\Services\LimitService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomComponentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $query = CustomComponent::with(['creator:id,name', 'studyGroup:id,name,slug']);

        if ($user) {
            $memberGroupIds = StudyGroupMember::where('user_id', $user->id)->pluck('study_group_id');
            $query->where(function ($q) use ($user, $memberGroupIds) {
                $q->where('visibility', 'public')
                    ->orWhere('user_id', $user->id)
                    ->orWhere(function ($gq) use ($memberGroupIds) {
                        $gq->where('visibility', 'group')
                            ->whereIn('study_group_id', $memberGroupIds);
                    });
            });
        } else {
            $query->where('visibility', 'public');
        }

        return ApiResponse::success([
            'components' => $query->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('components.create') && !$user->can('scenarios.create')) {
            return ApiResponse::error('You do not have permission to create custom components.', 403, 'forbidden');
        }

        // Normalize DynamicComponentBuilder v2 Studio payload if sent directly or wrapped in manifest_json
        $manifest = is_array($request->input('manifest_json'))
            ? $request->input('manifest_json')
            : $request->all();

        $rawTypeId = (string) ($request->input('type_id') ?? $manifest['typeId'] ?? $request->input('part_number') ?? 'custom.module');
        $cleanTypeId = str_starts_with($rawTypeId, 'custom.')
            ? $rawTypeId
            : 'custom.' . strtolower(preg_replace('/[^a-zA-Z0-9_]+/', '_', $rawTypeId));
        $partNumber = strtoupper(str_replace('custom.', '', $cleanTypeId));

        $existing = CustomComponent::where('user_id', $user->id)
            ->where('part_number', $partNumber)
            ->first();

        if (!$existing) {
            $quota = LimitService::canCreate(RoleLimit::RESOURCE_CUSTOM_COMPONENT, $user);
            if (!$quota['allowed']) {
                return ApiResponse::error($quota['message'], 403, $quota['reason'] ?? 'total_limit_reached', $quota);
            }
        }

        $name = trim((string) ($request->input('name') ?? $manifest['name'] ?? $partNumber));
        $isProp = (bool) ($request->input('is_environment_prop') ?? $manifest['isEnvironmentProp'] ?? false);
        $category = (string) ($request->input('category') ?? $manifest['category'] ?? ($isProp ? 'props' : 'custom'));
        $visibility = (string) ($request->input('visibility') ?? 'public');
        if (!in_array($visibility, ['private', 'group', 'public'], true)) {
            $visibility = 'public';
        }
        // Any authenticated user can save their own custom component; public publishing requires components.publish
        if ($visibility === 'public' && !$user->can('components.publish')) {
            $visibility = 'private';
        }

        $pinout = is_array($request->input('pinout'))
            ? $request->input('pinout')
            : (is_array($manifest['pins'] ?? null) ? $manifest['pins'] : []);

        $dipoles = is_array($request->input('internal_dipoles'))
            ? $request->input('internal_dipoles')
            : (is_array($manifest['dipoles'] ?? null) ? $manifest['dipoles'] : []);

        $testControls = is_array($manifest['testControls'] ?? null) ? $manifest['testControls'] : [];

        $electricalSpecs = is_array($request->input('electrical_specs'))
            ? $request->input('electrical_specs')
            : [
                'typeId' => $cleanTypeId,
                'isEnvironmentProp' => $isProp,
                'evaluateScript' => $manifest['evaluateScript'] ?? null,
                'obstacleProfile' => $manifest['obstacleProfile'] ?? null,
                'testControls' => $testControls,
            ];

        $meshRecipe = is_array($request->input('mesh_recipe'))
            ? $request->input('mesh_recipe')
            : [
                'v2_spec' => array_merge($manifest, [
                    'typeId' => $cleanTypeId,
                    'name' => $name,
                    'category' => $category,
                    'isEnvironmentProp' => $isProp,
                    'pins' => $pinout,
                    'dipoles' => $dipoles,
                    'testControls' => $testControls,
                ]),
            ];

        if ($existing) {
            $existing->update([
                'name' => $name,
                'category' => $category,
                'visibility' => $visibility,
                'pinout' => $pinout,
                'electrical_specs' => $electricalSpecs,
                'internal_dipoles' => $dipoles,
                'mesh_recipe' => $meshRecipe,
            ]);
            return ApiResponse::success([
                'component' => $existing->fresh()->load(['creator:id,name', 'studyGroup:id,name,slug']),
            ], 'Custom 3D component updated.', 200);
        }

        $slug = Str::slug($partNumber . '-' . $name) . '-' . strtolower(Str::random(5));

        $component = CustomComponent::create([
            'user_id' => $user->id,
            'study_group_id' => $request->input('study_group_id') ?: null,
            'part_number' => $partNumber,
            'name' => $name,
            'slug' => $slug,
            'category' => $category,
            'visibility' => $visibility,
            'pinout' => $pinout,
            'electrical_specs' => $electricalSpecs,
            'internal_dipoles' => $dipoles,
            'mesh_recipe' => $meshRecipe,
            'datasheet_url' => $request->input('datasheet_url') ?: null,
        ]);

        return ApiResponse::success([
            'component' => $component->load(['creator:id,name', 'studyGroup:id,name,slug']),
        ], 'Custom 3D component saved.', 201);
    }

    public function show(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $cleanPart = strtoupper(str_replace('custom.', '', $idOrSlug));
        $component = CustomComponent::where('slug', $idOrSlug)
            ->orWhere('part_number', $cleanPart)
            ->orWhere('id', is_numeric($idOrSlug) ? (int) $idOrSlug : -1)
            ->first();

        if (!$component) {
            return ApiResponse::error('Custom component not found.', 404, 'not_found');
        }

        if ($component->visibility === 'private' && $component->user_id !== $user?->id) {
            return ApiResponse::error('This custom component is private.', 403, 'component_private');
        }

        return ApiResponse::success([
            'component' => $component->load(['creator:id,name', 'studyGroup:id,name,slug']),
        ]);
    }

    public function destroy(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $cleanPart = strtoupper(str_replace('custom.', '', $idOrSlug));
        $component = CustomComponent::where('user_id', $user->id)
            ->where(function ($q) use ($idOrSlug, $cleanPart) {
                $q->where('slug', $idOrSlug)
                    ->orWhere('part_number', $cleanPart)
                    ->orWhere('id', is_numeric($idOrSlug) ? (int) $idOrSlug : -1);
            })
            ->first();

        if (!$component) {
            return ApiResponse::error('Custom component not found.', 404, 'not_found');
        }

        $component->delete();

        return ApiResponse::success([
            'deleted' => true,
            'type_id' => 'custom.' . strtolower($cleanPart),
        ], 'Custom component deleted.');
    }
}
