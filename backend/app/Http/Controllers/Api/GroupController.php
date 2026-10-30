<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoleLimit;
use App\Models\StudyGroup;
use App\Models\StudyGroupMember;
use App\Models\User;
use App\Services\LimitService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $query = StudyGroup::with(['owner:id,name'])
            ->withCount(['memberships as members_count', 'scenarios', 'customComponents']);

        $memberGroupIds = $user
            ? StudyGroupMember::where('user_id', $user->id)->pluck('study_group_id')->all()
            : [];

        if ($user) {
            $query->where(function ($q) use ($user, $memberGroupIds) {
                $q->where('is_public', true)
                    ->orWhere('owner_id', $user->id)
                    ->orWhereIn('id', $memberGroupIds);
            });
        } else {
            $query->where('is_public', true);
        }

        $groups = $query->latest()->get()->map(function (StudyGroup $g) use ($user, $memberGroupIds) {
            $canSeeInvite = $g->is_public || ($user && ($g->owner_id === $user->id || in_array($g->id, $memberGroupIds, true)));
            if (! $canSeeInvite) {
                $g->makeHidden(['invite_code']);
            }
            return $g;
        });

        return ApiResponse::success([
            'groups' => $groups,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('groups.create')) {
            return ApiResponse::error('You do not have permission to create a study group.', 403, 'forbidden');
        }

        $quota = LimitService::canCreate(RoleLimit::RESOURCE_STUDY_GROUP, $user);
        if (!$quota['allowed']) {
            return ApiResponse::error($quota['message'], 403, $quota['reason'] ?? 'total_limit_reached', $quota);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        $slug = Str::slug($validated['name']) . '-' . strtolower(Str::random(5));

        $group = StudyGroup::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'invite_code' => StudyGroup::generateInviteCode(),
            'is_public' => (bool) ($validated['is_public'] ?? false),
        ]);

        StudyGroupMember::create([
            'study_group_id' => $group->id,
            'user_id' => $user->id,
            'member_role' => 'owner',
            'joined_at' => now(),
        ]);

        return ApiResponse::success([
            'group' => $group->load('owner:id,name'),
        ], 'Study group created successfully.', 201);
    }

    public function join(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->can('groups.join')) {
            return ApiResponse::error('You do not have permission to join study groups.', 403, 'forbidden');
        }

        $validated = $request->validate([
            'invite_code' => ['required', 'string', 'max:24'],
        ]);

        $group = StudyGroup::where('invite_code', strtoupper(trim($validated['invite_code'])))->first();

        if (!$group) {
            return ApiResponse::error('Study group not found for this invite code.', 404, 'invalid_invite_code');
        }

        $membership = StudyGroupMember::firstOrCreate(
            [
                'study_group_id' => $group->id,
                'user_id' => $user->id,
            ],
            [
                'member_role' => $group->owner_id === $user->id ? 'owner' : 'member',
                'joined_at' => now(),
            ]
        );

        return ApiResponse::success([
            'group' => $group,
            'membership' => $membership,
        ], 'Joined study group successfully.');
    }

    public function show(Request $request, string $slugOrId): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user('sanctum');

        $group = StudyGroup::where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? (int) $slugOrId : -1)
            ->with(['owner:id,name'])
            ->withCount(['memberships as members_count'])
            ->first();

        if (!$group) {
            return ApiResponse::error('Study group not found.', 404, 'not_found');
        }

        $isMember = $group->hasMember($user);
        if (!$group->is_public && !$isMember) {
            return ApiResponse::error('This study group is private. Join with an invite code first.', 403, 'group_private');
        }

        $allowedVisibilities = $isMember ? ['group', 'public'] : ['public'];

        $scenarios = $group->scenarios()
            ->whereIn('visibility', $allowedVisibilities)
            ->with('owner:id,name')
            ->latest()
            ->get();

        $components = $group->customComponents()
            ->whereIn('visibility', $allowedVisibilities)
            ->with('creator:id,name')
            ->latest()
            ->get();

        return ApiResponse::success([
            'group' => $group,
            'is_member' => $isMember,
            'scenarios' => $scenarios,
            'custom_components' => $components,
        ]);
    }
}
