<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CircuitScenario;
use App\Models\RoleLimit;
use App\Models\StudyGroup;
use App\Models\StudyGroupMember;
use App\Models\User;
use App\Services\LimitService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ScenarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $query = CircuitScenario::with(['owner:id,name', 'studyGroup:id,name,slug']);

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

        $items = $query->latest()->get()->map(fn (CircuitScenario $s) => $this->formatScenarioItem($s));
        $userWorkspaces = $user
            ? $items->filter(fn (array $item) => (int) ($item['user_id'] ?? 0) === (int) $user->id)->values()
            : collect([]);

        return ApiResponse::success([
            'scenarios' => $items,
            'projects' => $items,
            'workspaces' => $userWorkspaces,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('scenarios.create')) {
            return ApiResponse::error('You do not have permission to create circuit scenarios.', 403, 'forbidden');
        }

        $quota = LimitService::canCreate(RoleLimit::RESOURCE_CIRCUIT_SCENARIO, $user);
        if (!$quota['allowed']) {
            return ApiResponse::error($quota['message'], 403, $quota['reason'] ?? 'total_limit_reached', $quota);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'board_type' => ['sometimes', 'string', 'max:64'],
            'visibility' => ['sometimes', 'string', 'in:private,group,public'],
            'study_group_id' => ['nullable', 'integer', 'exists:study_groups,id'],
            'scenario_data' => ['nullable', 'array'],
            'circuit_json' => ['nullable', 'array'],
            'code' => ['nullable', 'string', 'max:20000'],
        ]);

        if (($validated['visibility'] ?? 'private') === 'public' && !$user->can('scenarios.publish')) {
            return ApiResponse::error('You do not have permission to publish public circuit scenarios.', 403, 'forbidden');
        }

        if (!empty($validated['study_group_id'])) {
            $group = StudyGroup::find($validated['study_group_id']);
            if (!$group || !$group->hasMember($user)) {
                return ApiResponse::error('You must be a member of the target study group to share a circuit there.', 403, 'not_group_member');
            }
        }

        $scenarioData = $validated['scenario_data'] ?? $validated['circuit_json'] ?? [
            'version' => 2,
            'boards' => [['id' => 'host_mcu', 'typeId' => $validated['board_type'] ?? 'board.arduino_uno']],
            'components' => [],
            'connections' => [],
        ];
        if (isset($validated['code']) && is_string($validated['code'])) {
            $scenarioData['code'] = $validated['code'];
        }

        $slug = Str::slug($validated['title']) . '-' . strtolower(Str::random(6));

        $scenario = CircuitScenario::create([
            'user_id' => $user->id,
            'study_group_id' => $validated['study_group_id'] ?? null,
            'title' => $validated['title'],
            'slug' => $slug,
            'summary' => $validated['summary'] ?? null,
            'board_type' => $validated['board_type'] ?? 'board.arduino_uno',
            'visibility' => $validated['visibility'] ?? 'private',
            'scenario_data' => $scenarioData,
        ]);

        $formatted = $this->formatScenarioItem($scenario->load(['owner:id,name', 'studyGroup:id,name,slug']));

        return ApiResponse::success([
            'scenario' => $formatted,
            'project' => $formatted,
        ], 'Circuit workspace saved successfully.', 201);
    }

    public function show(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $scenario = $this->resolveScenario($idOrSlug);
        if (!$scenario) {
            return ApiResponse::error('Circuit scenario not found.', 404, 'not_found');
        }

        if ($scenario->visibility === 'private' && $scenario->user_id !== $user?->id) {
            return ApiResponse::error('This circuit scenario is private.', 403, 'scenario_private');
        }

        if ($scenario->visibility === 'group' && $scenario->user_id !== $user?->id) {
            $group = $scenario->studyGroup;
            if (!$group || !$group->hasMember($user)) {
                return ApiResponse::error('This circuit scenario is shared only with its study group.', 403, 'scenario_group_restricted');
            }
        }

        return ApiResponse::success([
            'scenario' => $scenario->load(['owner:id,name', 'studyGroup:id,name,slug', 'remixedFrom:id,title,slug']),
        ]);
    }

    public function update(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('scenarios.edit')) {
            return ApiResponse::error('You do not have permission to edit circuit scenarios.', 403, 'forbidden');
        }

        $scenario = $this->resolveScenario($idOrSlug);
        if (!$scenario) {
            return ApiResponse::error('Circuit scenario not found.', 404, 'not_found');
        }

        if ($scenario->user_id !== $user->id) {
            return ApiResponse::error('Only the owner can edit this circuit scenario directly. Fork it instead.', 403, 'not_owner');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'board_type' => ['sometimes', 'string', 'max:64'],
            'visibility' => ['sometimes', 'string', 'in:private,group,public'],
            'study_group_id' => ['nullable', 'integer', 'exists:study_groups,id'],
            'scenario_data' => ['sometimes', 'array'],
            'circuit_json' => ['sometimes', 'array'],
            'code' => ['nullable', 'string', 'max:20000'],
        ]);

        if (($validated['visibility'] ?? null) === 'public' && !$user->can('scenarios.publish')) {
            return ApiResponse::error('You do not have permission to publish public circuit scenarios.', 403, 'forbidden');
        }

        if (!empty($validated['study_group_id'])) {
            $group = StudyGroup::find($validated['study_group_id']);
            if (!$group || !$group->hasMember($user)) {
                return ApiResponse::error('You must be a member of the target study group to share a circuit there.', 403, 'not_group_member');
            }
        }

        $updatePayload = [];
        foreach (['title', 'summary', 'board_type', 'visibility', 'study_group_id'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updatePayload[$field] = $validated[$field];
            }
        }

        if (isset($validated['scenario_data']) || isset($validated['circuit_json'])) {
            $nextData = $validated['scenario_data'] ?? $validated['circuit_json'];
            if (isset($validated['code']) && is_string($validated['code'])) {
                $nextData['code'] = $validated['code'];
            } elseif (is_array($scenario->scenario_data) && isset($scenario->scenario_data['code']) && !isset($nextData['code'])) {
                $nextData['code'] = $scenario->scenario_data['code'];
            }
            $updatePayload['scenario_data'] = $nextData;
        } elseif (isset($validated['code']) && is_string($validated['code'])) {
            $nextData = is_array($scenario->scenario_data) ? $scenario->scenario_data : [];
            $nextData['code'] = $validated['code'];
            $updatePayload['scenario_data'] = $nextData;
        }

        $scenario->update($updatePayload);

        $formatted = $this->formatScenarioItem($scenario->fresh(['owner:id,name', 'studyGroup:id,name,slug']));

        return ApiResponse::success([
            'scenario' => $formatted,
            'project' => $formatted,
        ], 'Circuit workspace updated.');
    }

    public function destroy(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('scenarios.delete')) {
            return ApiResponse::error('You do not have permission to delete circuit scenarios.', 403, 'forbidden');
        }

        $scenario = $this->resolveScenario($idOrSlug);
        if (!$scenario) {
            return ApiResponse::error('Circuit workspace not found.', 404, 'not_found');
        }

        if ($scenario->user_id !== $user->id) {
            return ApiResponse::error('Only the owner can delete this workspace.', 403, 'not_owner');
        }

        $deletedId = $scenario->id;
        $deletedSlug = $scenario->slug;
        $scenario->delete();

        return ApiResponse::success([
            'deleted' => true,
            'id' => $deletedId,
            'slug' => $deletedSlug,
        ], 'Circuit workspace deleted.');
    }

    private function formatScenarioItem(CircuitScenario $scenario): array
    {
        $arr = $scenario->toArray();
        $scenarioData = is_array($scenario->scenario_data) ? $scenario->scenario_data : [];
        $arr['scenario_data'] = $scenarioData;
        $arr['circuit_json'] = $scenarioData;
        $arr['code'] = $scenarioData['code'] ?? '';
        return $arr;
    }

    public function fork(Request $request, string $idOrSlug): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('scenarios.fork')) {
            return ApiResponse::error('You do not have permission to fork circuit scenarios.', 403, 'forbidden');
        }

        $quota = LimitService::canCreate(RoleLimit::RESOURCE_CIRCUIT_SCENARIO, $user);
        if (!$quota['allowed']) {
            return ApiResponse::error($quota['message'], 403, $quota['reason'] ?? 'total_limit_reached', $quota);
        }

        $source = $this->resolveScenario($idOrSlug);
        if (!$source) {
            return ApiResponse::error('Source circuit scenario not found.', 404, 'not_found');
        }

        if ($source->visibility === 'private' && $source->user_id !== $user->id) {
            return ApiResponse::error('Cannot fork a private circuit scenario owned by another user.', 403, 'scenario_private');
        }

        if ($source->visibility === 'group' && $source->user_id !== $user->id) {
            $group = $source->studyGroup;
            if (!$group || !$group->hasMember($user)) {
                return ApiResponse::error('You must be a member of the study group to fork this circuit.', 403, 'scenario_group_restricted');
            }
        }

        $newTitle = trim((string) $request->input('title', $source->title . ' (Remix)'));
        $slug = Str::slug($newTitle) . '-' . strtolower(Str::random(6));

        $forked = CircuitScenario::create([
            'user_id' => $user->id,
            'study_group_id' => null,
            'remixed_from_id' => $source->id,
            'title' => $newTitle,
            'slug' => $slug,
            'summary' => $source->summary,
            'board_type' => $source->board_type,
            'visibility' => 'private',
            'scenario_data' => $source->scenario_data,
        ]);

        $source->increment('forks_count');

        return ApiResponse::success([
            'scenario' => $forked->load(['owner:id,name', 'remixedFrom:id,title,slug']),
        ], 'Circuit scenario forked into your workspace.', 201);
    }

    private function resolveScenario(string $idOrSlug): ?CircuitScenario
    {
        return CircuitScenario::where('slug', $idOrSlug)
            ->orWhere('id', is_numeric($idOrSlug) ? (int) $idOrSlug : -1)
            ->first();
    }
}
