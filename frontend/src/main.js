import { BoardStage } from './stage/boardStage.js';
import { registerAllHardware } from './hardware/registerAllHardware.js';
import { hardwareRegistry } from './core/registry/ComponentRegistry.js';
import { circuitFlowSolver } from './core/electrical/CircuitFlowSolver.js';
import { themeService } from './core/theme/ThemeService.js';
import { LiveCodeRuntime } from './sim/LiveCodeRuntime.js';
import { backendApiClient } from './core/ai/BackendApiClient.js';
import { StageAiCommandExecutor } from './core/ai/StageAiCommandExecutor.js';
import { TopContextPill } from './ui/workbench/TopContextPill.js';
import { BottomFloatingDock } from './ui/workbench/BottomFloatingDock.js';
import { AiAgentChatPanel } from './ui/workbench/AiAgentChatPanel.js';
import { CodeDrawerController } from './ui/workbench/CodeDrawerController.js';
import { ComponentPalettePopover } from './ui/workbench/ComponentPalettePopover.js';
import { DiagnosticHudCard } from './ui/workbench/DiagnosticHudCard.js';
import { ProjectsAndGroupsModal } from './ui/workbench/ProjectsAndGroupsModal.js';
import { AuthAndSettingsModal } from './ui/workbench/AuthAndSettingsModal.js';
import { CreditStoreModal } from './ui/workbench/CreditStoreModal.js';
import { LandingShowcaseController } from './ui/landing/LandingShowcaseController.js';
import { CustomComponentStudioPage } from './ui/studio/CustomComponentStudioPage.js';
import { AppRouter } from './core/router/AppRouter.js';

/**
 * CircuitLab 3D — Canvas-First Spatial Hardware Workbench Bootstrapper.
 *
 * Coordinates:
 * - Full-bleed 3D `BoardStage` (`Arduino Uno R3`, `ESP32 DevKit V1`, `NVIDIA Jetson Nano`)
 * - `LiveCodeRuntime` ↔ `CircuitFlowSolver` real closed-loop electrical simulation
 * - `TopContextPill` (Board switcher, live multimeter badge, Dipole X-Ray toggle, TR/EN, Dark/Light, Cloud Auto-Save status, Top-Right Account & Logout)
 * - `BottomFloatingDock` (Quick tools, natural-language circuit command input with one-click Undo, Code & Examples triggers)
 * - On-demand drawers & modals (`CodeDrawerController`, `ComponentPalettePopover`, `ProjectsAndGroupsModal`, `AuthAndSettingsModal`, `DiagnosticHudCard`)
 */
export function initSpatialWorkbench() {
  registerAllHardware(hardwareRegistry);
  themeService.applyToDocument();

  const canvasEl = document.getElementById('board-canvas');
  if (!canvasEl) return null;

  const stage = new BoardStage({
    canvas: canvasEl,
    stageEl: document.getElementById('stage')
  });

  // Ensure initial host board is spawned
  stage.ensureHostBoard('board.arduino_uno');

  const runtime = new LiveCodeRuntime({
    getHostBoard: () => stage.hostBoard,
    getStageComponents: () => stage.getIndependentComponents(),
    getConnections: () => stage.wireTool?.getConnections?.() || [],
    solver: circuitFlowSolver,
    onSerialOutput: (entry) => {
      codeDrawer?.appendSerialEntry?.(entry);
    },
    onPinStatesChanged: (pinStates) => {
      codeDrawer?.updatePinStates?.(pinStates);
    }
  });

  const aiExecutor = new StageAiCommandExecutor({
    stage,
    runtime,
    registry: hardwareRegistry,
    apiClient: backendApiClient,
    solver: circuitFlowSolver,
    onCodeUpdated: (code) => {
      if (typeof code === 'string' && code.trim()) {
        codeDrawer?.setSourceCode?.(code);
      }
      bottomDock?.setRunning?.(Boolean(runtime?.isRunning));
    },
    onAgentProgress: (evt) => {
      if (evt?.phase === 'search_mode') {
        bottomDock?.setAgentStatus?.('🔍 Search Mode: Bileşen pin şemaları taranıyor...');
      } else if (evt?.phase === 'code_mode') {
        bottomDock?.setAgentStatus?.('⚡ Code Mode: 3B devre, kablolar ve kod sentezleniyor...');
      } else if (evt?.phase === 'completed') {
        const summary = evt?.result?.summary || 'Devre ve kod başarıyla sentezlendi.';
        bottomDock?.setAgentStatus?.(`✓ ${summary}`);
        setTimeout(() => {
          bottomDock?.setAgentStatus?.('');
        }, 4200);
      } else if (evt?.phase === 'error') {
        const errMessage =
          evt?.result?.message ||
          evt?.result?.summaryText ||
          i18n.t('workbench.aiChat.errorFallback');
        bottomDock?.setAgentStatus?.(`⚠️ ${errMessage}`);
      } else if (evt?.phase === 'insufficient_credits') {
        bottomDock?.setAgentStatus?.(
          `⚠️ ${i18n.t('workbench.aiChat.errors.insufficientCredits')}`
        );
      }
    }
  });

  const diagnosticHud = new DiagnosticHudCard({
    rootEl: document.getElementById('diagnostic-hud-root'),
    apiClient: backendApiClient,
    commandExecutor: aiExecutor
  }).mount();

  const router = new AppRouter();

  const handleLogoutEverywhere = async () => {
    await authModal.logout();
  };

  const topPill = new TopContextPill({
    rootEl: document.getElementById('top-context-root'),
    activeBoardId: 'board.arduino_uno',
    onSelectBoard: (boardTypeId) => {
      stage.ensureHostBoard(boardTypeId);
      runtime.step();
      projectsModal.scheduleAutoSave('board_switch');
    },
    onToggleXRay: (enabled) => {
      stage.setXRayMode(enabled);
    },
    onOpenAuthModal: (tab = 'login') => {
      if (backendApiClient.isAuthenticated()) {
        authModal.close();
        creditStoreModal?.close?.();
        projectsModal.open('account');
        return;
      }
      projectsModal.close({ fromRouter: true });
      creditStoreModal?.close?.();
      authModal.open(tab);
    },
    onOpenDashboard: (tab = 'workspaces') => {
      authModal.close();
      creditStoreModal?.close?.();
      projectsModal.open(tab);
    },
    onOpenCreditStore: (tab = 'packages') => {
      authModal.close();
      projectsModal.close();
      creditStoreModal.open(tab);
    },
    onLogout: () => {
      handleLogoutEverywhere();
    },
    onOpenStudio: () => {
      openCustomStudio();
    },
    onOpenShowcase: () => {
      customStudioPage?.close?.();
      palettePopover.close();
      projectsModal.close();
      authModal.close();
      creditStoreModal?.close?.();
      codeDrawer.close();
      bottomDock.setCodeDrawerOpen(false);
      projectsModal.hideGuestPrompt();
      landingShowcase.show();
      router.navigate('/');
    }
  }).mount();

  const creditStoreModal = new CreditStoreModal({
    rootEl: document.getElementById('modal-root'),
    apiClient: backendApiClient,
    onCreditsUpdated: (credits) => {
      topPill.setCredits(credits);
      customStudioPage?.setCredits?.(credits);
    },
    onRequireAuth: (tab = 'login') => {
      projectsModal.close();
      authModal.open(tab);
    }
  }).mount();

  topPill.setCredits(backendApiClient.getCredits());
  backendApiClient.onCreditChange((credits) => {
    topPill.setCredits(credits);
    customStudioPage?.setCredits?.(credits);
  });

  const codeDrawer = new CodeDrawerController({
    rootEl: document.getElementById('drawer-root'),
    runtime,
    onCodeChange: () => {
      if (!isBootstrappingStage && !landingShowcase?.isVisible) {
        projectsModal?.scheduleAutoSave('code_edit');
      }
    },
    onRunStateChange: (running) => {
      bottomDock.setRunning(running);
      if (running && !isBootstrappingStage && !landingShowcase?.isVisible) {
        projectsModal.scheduleAutoSave('code_run');
      }
    }
  }).mount();

  const openCustomStudio = (studioOpts = {}) => {
    palettePopover?.close?.();
    projectsModal?.close?.({ fromRouter: true });
    authModal?.close?.();
    creditStoreModal?.close?.();
    codeDrawer?.close?.();
    bottomDock?.setCodeDrawerOpen?.(false);
    landingShowcase?.hide?.();
    customStudioPage?.open?.(studioOpts);
    const activeSlug = customStudioPage?.getComponentSlug?.() || studioOpts.componentSlug || null;
    const targetHref = activeSlug ? `/studio/${encodeURIComponent(activeSlug)}` : '/studio';
    if (router.currentRoute.href !== targetHref) {
      router.navigate(targetHref, {
        replace: router.currentRoute.view === 'studio' && !router.currentRoute.componentSlug
      });
    }
  };

  let studioRootEl = document.getElementById('custom-studio-root');
  if (!studioRootEl && typeof document !== 'undefined' && document.body) {
    studioRootEl = document.createElement('section');
    studioRootEl.id = 'custom-studio-root';
    studioRootEl.className = 'custom-studio-layer';
    studioRootEl.hidden = true;
    (document.getElementById('app') || document.body).appendChild(studioRootEl);
  }

  const customStudioPage = new CustomComponentStudioPage({
    container: studioRootEl,
    registry: hardwareRegistry,
    backendClient: backendApiClient,
    themeService,
    sessionUser: backendApiClient.user || null,
    credits: backendApiClient.getCredits(),
    onRouteChange: (componentSlug) => {
      if (!customStudioPage?.isOpen || !componentSlug) return;
      const targetHref = `/studio/${encodeURIComponent(componentSlug)}`;
      if (router.currentRoute.href !== targetHref) {
        router.navigate(targetHref, {
          replace: router.currentRoute.view === 'studio' && !router.currentRoute.componentSlug
        });
      }
    },
    onOpenAuthModal: (tab = 'login') => {
      if (backendApiClient.isAuthenticated()) {
        authModal.close();
        creditStoreModal?.close?.();
        projectsModal.open('account');
        return;
      }
      projectsModal.close({ fromRouter: true });
      creditStoreModal?.close?.();
      authModal.open(tab);
    },
    onOpenDashboard: (tab = 'workspaces') => {
      authModal.close();
      creditStoreModal?.close?.();
      projectsModal.open(tab);
    },
    onOpenCreditStore: (tab = 'packages') => {
      authModal.close();
      projectsModal.close({ fromRouter: true });
      creditStoreModal.open(tab);
    },
    onLogout: () => {
      handleLogoutEverywhere();
    },
    onSaveComponent: () => {
      aiExecutor?.capabilityIndex?.rebuildIndex?.();
      projectsModal?.refreshCustomComponents?.();
      if (palettePopover?.isOpen) {
        palettePopover.render();
      }
    },
    onSpawnToWorkbench: (savedSchema) => {
      customStudioPage.close();
      landingShowcase?.hide?.();
      const ws = projectsModal?.activeWorkspace;
      router.navigate(ws?.slug ? `/workspace/${encodeURIComponent(ws.slug)}` : '/workbench');
      aiExecutor?.capabilityIndex?.rebuildIndex?.();
      stage?.spawnIndependentComponent?.(savedSchema.typeId);
      stage?.resize?.();
      runtime?.solveCircuit?.();
      runtime?.step?.();
      projectsModal?.scheduleAutoSave?.('spawn_custom_component');
    },
    onBackToWorkbench: () => {
      customStudioPage.close();
      landingShowcase?.hide?.();
      const ws = projectsModal?.activeWorkspace;
      router.navigate(ws?.slug ? `/workspace/${encodeURIComponent(ws.slug)}` : '/workbench');
      stage?.resize?.();
    }
  });

  const palettePopover = new ComponentPalettePopover({
    rootEl: document.getElementById('popover-root'),
    stage,
    registry: hardwareRegistry,
    apiClient: backendApiClient,
    onOpenFullStudio: () => {
      openCustomStudio();
    }
  }).mount();

  const projectsModal = new ProjectsAndGroupsModal({
    rootEl: document.getElementById('modal-root'),
    stage,
    registry: hardwareRegistry,
    apiClient: backendApiClient,
    getCurrentCode: () => codeDrawer.getSourceCode(),
    onOpenAuthModal: (tab = 'login') => {
      projectsModal.close({ fromRouter: true });
      authModal.open(tab);
    },
    onWorkspaceStatusChange: (status) => {
      topPill.setWorkspaceStatus(status);
    },
    onActiveWorkspaceChange: (workspace) => {
      if (!workspace?.slug) return;
      if (!landingShowcase?.isVisible && !projectsModal.isOpen && !router.currentRoute.preset) {
        const targetHref = `/workspace/${encodeURIComponent(workspace.slug)}`;
        if (router.currentRoute.href !== targetHref) {
          router.navigate(targetHref, {
            replace: router.currentRoute.view === 'workbench' && !router.currentRoute.workspaceSlug
          });
        }
      }
    },
    onScenarioLoaded: ({ project, code }) => {
      if (project?.board_type) {
        topPill.setActiveBoard(project.board_type);
      }
      lastWireCount = stage.wireTool?.getConnections?.()?.length || 0;
      if (typeof code === 'string' && code.length > 0) {
        codeDrawer.setSourceCode(code);
        runtime.loadCode(code);
        runtime.refreshInteractiveState();
      } else {
        runtime.step();
      }
    },
    onRouteSync: (tab = 'workspaces') => {
      if (landingShowcase?.isVisible) {
        landingShowcase.hide();
      }
      const nextHref = tab && tab !== 'workspaces' ? `/workspace?tab=${encodeURIComponent(tab)}` : '/workspace';
      if (router.currentRoute.view !== 'workspace' || router.currentRoute.tab !== tab) {
        router.navigate(nextHref);
      }
    },
    onCloseToWorkbench: (activeWorkspace) => {
      const ws = activeWorkspace || projectsModal.activeWorkspace;
      const targetHref = ws?.slug ? `/workspace/${encodeURIComponent(ws.slug)}` : '/workbench';
      if (
        router.currentRoute.view === 'workspace' ||
        (ws?.slug && router.currentRoute.href !== targetHref)
      ) {
        router.navigate(targetHref);
      }
      stage.resize();
    },
    onOpenCreditStore: (tab = 'packages') => {
      projectsModal.close({ fromRouter: true });
      const ws = projectsModal.activeWorkspace;
      router.navigate(ws?.slug ? `/workspace/${encodeURIComponent(ws.slug)}` : '/workbench');
      creditStoreModal.open(tab);
    },
    onOpenStudio: (slug) => {
      if (slug === 'new') {
        openCustomStudio({});
        customStudioPage?.createNewComponent?.();
      } else {
        openCustomStudio(slug ? { componentSlug: slug } : {});
      }
    },
    onLogout: () => {
      handleLogoutEverywhere();
    },
    onProfileUpdated: (updatedUser) => {
      topPill.setSessionUser(updatedUser);
      topPill.setCredits(updatedUser ? backendApiClient.getCredits() : null);
      customStudioPage?.setSessionUser?.(updatedUser);
      customStudioPage?.setCredits?.(updatedUser ? backendApiClient.getCredits() : null);
      landingShowcase?.setSessionUser?.(updatedUser);
      authModal?.setSessionUser?.(updatedUser);
    }
  }).mount();

  const syncSessionAcrossUi = async (user, { targetWorkspaceSlug = null, initialProject = null } = {}) => {
    topPill.setSessionUser(user);
    topPill.setCredits(user ? backendApiClient.getCredits() : null);
    customStudioPage?.setSessionUser?.(user);
    customStudioPage?.setCredits?.(user ? backendApiClient.getCredits() : null);
    landingShowcase?.setSessionUser?.(user);
    authModal?.setSessionUser?.(user);
    if (!user) {
      creditStoreModal?.close?.();
    }
    try {
      await backendApiClient.hydrateCustomComponentsIntoRegistry(hardwareRegistry);
      if (palettePopover?.isOpen) {
        palettePopover.render();
      }
      if (customStudioPage?.isOpen) {
        if (router.currentRoute.componentSlug) {
          customStudioPage.openComponentBySlug(router.currentRoute.componentSlug);
        } else {
          customStudioPage.render();
        }
      }
    } catch (_err) {
      // Ignore custom component hydration errors during bootstrap
    }
    if (user && initialProject) {
      await projectsModal.setSessionUser(user, {
        autoCreateWorkspaceIfEmpty: false
      });
      await projectsModal.handleWorkbenchSessionStart({
        source: router.currentRoute.preset || 'preset',
        project: initialProject
      });
    } else {
      await projectsModal.setSessionUser(user, {
        autoCreateWorkspaceIfEmpty:
          !landingShowcase?.isVisible && !projectsModal.isOpen && !customStudioPage?.isOpen,
        targetWorkspaceSlug: targetWorkspaceSlug || router.currentRoute.workspaceSlug || null
      });
    }
    if (!user && !landingShowcase?.isVisible && !projectsModal.isOpen && !customStudioPage?.isOpen) {
      await projectsModal.handleWorkbenchSessionStart({
        source: router.currentRoute.preset || 'direct_workbench',
        project: initialProject,
        workspaceSlug: targetWorkspaceSlug || router.currentRoute.workspaceSlug || null
      });
    }
  };

  const authModal = new AuthAndSettingsModal({
    rootEl: document.getElementById('modal-root'),
    apiClient: backendApiClient,
    onSessionChange: (user) => {
      syncSessionAcrossUi(user);
    },
    onOpenDashboard: () => {
      if (landingShowcase.isVisible) {
        landingShowcase.hide();
        stage.resize();
      }
      projectsModal.open('workspaces');
    }
  }).mount();

  let isBootstrappingStage = true;

  stage.onStageComponentsChange(() => {
    const activeType = stage.hostBoard?.typeId || 'none';
    if (topPill.activeBoardId !== activeType) {
      topPill.setActiveBoard(activeType);
    }
    runtime.refreshInteractiveState();
    if (!isBootstrappingStage && !landingShowcase?.isVisible) {
      projectsModal.scheduleAutoSave('stage_components');
    }
  });

  const executeAiPromptFlow = async (promptText, options = {}) => {
    if (!backendApiClient.isAuthenticated()) {
      projectsModal.close();
      authModal.open('login');
      return {
        ok: false,
        status: 401,
        error: 'unauthenticated'
      };
    }
    bottomDock.setBusy(true);
    try {
      const res = await aiExecutor.runFlownieAgentPrompt(promptText, options);
      if (res?.status === 401 || res?.error === 'unauthenticated') {
        projectsModal.close();
        authModal.open('login');
        return res;
      }
      if (res?.error === 'insufficient_credits' || res?.status === 402) {
        creditStoreModal.open('packages', {
          reason: 'insufficient_credits',
          requiredCredits: res?.requiredCredits ?? 1.5
        });
        return res;
      }
      const canUndo = aiExecutor.canUndo();
      bottomDock.setCanUndoAi(canUndo);
      aiChatPanel.setCanUndo(canUndo);
      if (aiExecutor.runtime?.sourceCode) {
        codeDrawer.setSourceCode(aiExecutor.runtime.sourceCode);
      }
      projectsModal.scheduleAutoSave('ai_command');
      return res;
    } finally {
      bottomDock.setBusy(false);
    }
  };

  const handleUndoAiEverywhere = () => {
    aiExecutor.undoLastTransaction();
    const canUndo = aiExecutor.canUndo();
    bottomDock.setCanUndoAi(canUndo);
    aiChatPanel.setCanUndo(canUndo);
    projectsModal.scheduleAutoSave('ai_undo');
  };

  const aiChatPanel = new AiAgentChatPanel({
    rootEl: document.getElementById('ai-chat-root'),
    canvasEl: canvasEl,
    aiExecutor,
    initialLayoutMode: 'dock',
    onSubmitPrompt: (promptText, options) => executeAiPromptFlow(promptText, options),
    onResumeAgent: async (decision, pending) => {
      bottomDock.setBusy(true);
      try {
        const res = await aiExecutor.resumeFlownieAgentPrompt(decision, pending);
        const canUndo = aiExecutor.canUndo();
        bottomDock.setCanUndoAi(canUndo);
        aiChatPanel.setCanUndo(canUndo);
        if (aiExecutor.runtime?.sourceCode) {
          codeDrawer.setSourceCode(aiExecutor.runtime.sourceCode);
        }
        projectsModal.scheduleAutoSave('ai_command_resume');
        return res;
      } finally {
        bottomDock.setBusy(false);
      }
    },
    onUndoLastCommand: handleUndoAiEverywhere,
    onLayoutModeChange: (mode) => {
      if (mode === 'sidebar') {
        projectsModal?.hideGuestPrompt?.();
      }
      bottomDock.setAiSidebarOpen(mode === 'sidebar');
      stage.resize();
    }
  }).mount();

  const bottomDock = new BottomFloatingDock({
    rootEl: document.getElementById('bottom-dock-root'),
    onSelectTool: (toolId) => {
      if (toolId === 'wire') {
        stage.wireTool?.setEnabled?.(true);
      } else {
        stage.wireTool?.setEnabled?.(false);
      }
    },
    onTogglePartPalette: () => {
      palettePopover.toggle();
    },
    onToggleSimulation: (shouldRun) => {
      const nextRun = typeof shouldRun === 'boolean' ? shouldRun : !runtime.isRunning;
      if (nextRun) {
        runtime.loadCode(codeDrawer.getSourceCode());
        runtime.start();
      } else {
        runtime.stop();
      }
      bottomDock.setRunning(runtime.isRunning);
    },
    onSubmitCircuitCommand: async (promptText) => {
      return aiChatPanel.submitPrompt(promptText);
    },
    onUndoLastCommand: handleUndoAiEverywhere,
    onAttachStageScreenshot: () => {
      aiChatPanel.captureStageScreenshot();
    },
    onToggleAiSidebar: () => {
      const nextMode = aiChatPanel.toggleLayoutMode();
      bottomDock.setAiSidebarOpen(nextMode === 'sidebar');
    },
    onToggleCodeDrawer: () => {
      codeDrawer.toggle();
      bottomDock.setCodeDrawerOpen(codeDrawer.isOpen);
    },
    onOpenProjectsModal: () => {
      authModal.close();
      projectsModal.toggle('workspaces');
    },
    onOpenStudio: () => {
      openCustomStudio();
    }
  }).mount();

  const applyProjectToWorkbench = (project) => {
    if (!project) return null;
    const loadRes = projectsModal.loadProjectOntoStage(project);
    if (project?.code) {
      codeDrawer.setSourceCode(project.code);
      runtime.loadCode(project.code);
      runtime.start();
      bottomDock.setRunning(runtime.isRunning);
    }
    stage.resize();
    return loadRes;
  };

  const startDirectlyInStudio = router.currentRoute.view === 'studio';
  const startDirectlyInWorkspace = router.currentRoute.view === 'workspace';
  const startDirectlyInWorkbench =
    router.currentRoute.view === 'workbench' || startDirectlyInWorkspace || startDirectlyInStudio;

  const landingShowcase = new LandingShowcaseController({
    rootEl: document.getElementById('landing-showcase-root'),
    initialVisible: !startDirectlyInWorkbench,
    sessionUser: backendApiClient.user,
    onOpenRobotInWorkbench: (project) => {
      const res = applyProjectToWorkbench(project);
      projectsModal.handleWorkbenchSessionStart({
        source: project?.slug || 'robot_preset',
        project
      });
      return res;
    },
    onEnterWorkbench: (payload = {}) => {
      const targetHref =
        payload?.source === 'sumo'
          ? '/workbench?preset=sumo'
          : payload?.source === 'jetson'
          ? '/workbench?preset=jetson'
          : '/workbench';
      router.navigate(targetHref);
      stage.resize();
      if (!payload?.project) {
        projectsModal.handleWorkbenchSessionStart({
          source: payload?.source || 'hero'
        });
      }
    },
    onOpenAuthModal: (tab = 'login') => {
      projectsModal.close({ fromRouter: true });
      authModal.open(tab);
    },
    onOpenDashboard: () => {
      landingShowcase.hide();
      stage.resize();
      projectsModal.open('workspaces');
    },
    onLogout: () => {
      handleLogoutEverywhere();
    }
  }).mount();

  // If page was loaded or refreshed directly on /workbench, /workspace/<slug>, /workspace, or /studio/<slug>
  let initialPresetProject = null;
  if (startDirectlyInStudio) {
    customStudioPage.open({ componentSlug: router.currentRoute.componentSlug });
  } else if (startDirectlyInWorkbench && !startDirectlyInWorkspace) {
    if (router.currentRoute.preset === 'sumo') {
      initialPresetProject = landingShowcase.sumoScene.getWorkbenchProject();
      applyProjectToWorkbench(initialPresetProject);
    } else if (router.currentRoute.preset === 'jetson') {
      initialPresetProject = landingShowcase.jetsonScene.getWorkbenchProject();
      applyProjectToWorkbench(initialPresetProject);
    }
  } else if (startDirectlyInWorkspace) {
    projectsModal.open(router.currentRoute.tab || 'workspaces', { fromRouter: true });
  }

  // Verify backend session on boot and hydrate the active /workspace/<slug> onto the 3D stage
  backendApiClient
    .verifySession()
    .then(async (verification) => {
      if (verification?.authenticated && verification?.user) {
        await syncSessionAcrossUi(verification.user, {
          targetWorkspaceSlug: router.currentRoute.workspaceSlug,
          initialProject: initialPresetProject
        });
      } else {
        await syncSessionAcrossUi(null, {
          targetWorkspaceSlug: router.currentRoute.workspaceSlug,
          initialProject: initialPresetProject
        });
      }
    })
    .finally(() => {
      isBootstrappingStage = false;
    });

  // Synchronize browser Back/Forward (popstate) and programmatic route changes
  router.onChange((route, meta) => {
    if (route.view === 'showcase') {
      customStudioPage.close();
      palettePopover.close();
      projectsModal.close({ fromRouter: true });
      authModal.close();
      codeDrawer.close();
      bottomDock.setCodeDrawerOpen(false);
      projectsModal.hideGuestPrompt();
      landingShowcase.show();
    } else if (route.view === 'studio') {
      landingShowcase.hide();
      palettePopover.close();
      projectsModal.close({ fromRouter: true });
      authModal.close();
      codeDrawer.close();
      bottomDock.setCodeDrawerOpen(false);
      projectsModal.hideGuestPrompt();
      if (!customStudioPage.isOpen) {
        customStudioPage.open({ componentSlug: route.componentSlug });
      } else if (
        route.componentSlug &&
        customStudioPage.getComponentSlug() !== route.componentSlug
      ) {
        customStudioPage.openComponentBySlug(route.componentSlug);
      }
    } else if (route.view === 'workspace') {
      customStudioPage.close();
      landingShowcase.hide();
      palettePopover.close();
      authModal.close();
      projectsModal.hideGuestPrompt();
      const targetTab = route.tab || 'workspaces';
      if (!projectsModal.isOpen || projectsModal.activeTab !== targetTab) {
        projectsModal.open(targetTab, { fromRouter: true });
      }
      stage.resize();
    } else {
      customStudioPage.close();
      landingShowcase.hide();
      if (projectsModal.isOpen) {
        projectsModal.close({ fromRouter: true });
      }
      if (
        route.workspaceSlug &&
        (!projectsModal.activeWorkspace || projectsModal.activeWorkspace.slug !== route.workspaceSlug)
      ) {
        projectsModal.handleWorkbenchSessionStart({
          source: meta?.source || 'route_change',
          workspaceSlug: route.workspaceSlug
        });
      } else if (meta?.source === 'popstate') {
        if (route.preset === 'sumo') {
          applyProjectToWorkbench(landingShowcase.sumoScene.getWorkbenchProject());
        } else if (route.preset === 'jetson') {
          applyProjectToWorkbench(landingShowcase.jetsonScene.getWorkbenchProject());
        }
      }
      stage.resize();
    }
  });

  let lastWireCount = stage.wireTool?.getConnections?.()?.length || 0;

  const handleFlowUpdate = (flowResult) => {
    topPill.updateFlowSummary(flowResult);
    diagnosticHud.inspectFlowResult(flowResult, topPill.activeBoardId);
    const currentWireCount = stage.wireTool?.getConnections?.()?.length || 0;
    if (currentWireCount !== lastWireCount) {
      lastWireCount = currentWireCount;
      if (!isBootstrappingStage && !landingShowcase.isVisible) {
        projectsModal.scheduleAutoSave('wire_connections');
      }
    }
  };

  runtime.onFlowUpdate(handleFlowUpdate);
  stage.onFlowSolved = handleFlowUpdate;

  // Global keyboard shortcuts (Ctrl+E = Code Drawer, Escape = Close overlays)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && typeof e.key === 'string' && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      codeDrawer.toggle();
      bottomDock.setCodeDrawerOpen(codeDrawer.isOpen);
      return;
    }
    if (e.key === 'Escape') {
      palettePopover.close();
      projectsModal.close();
      authModal.close();
      creditStoreModal.close();
      codeDrawer.close();
      bottomDock.setCodeDrawerOpen(false);
    }
  });

  // Start WebGL render loop
  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min(0.064, (now - lastTime) / 1000);
    lastTime = now;
    if (landingShowcase.isVisible) {
      landingShowcase.tick(dt);
    } else {
      stage.tick(dt);
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  return {
    stage,
    runtime,
    aiExecutor,
    aiChatPanel,
    topPill,
    bottomDock,
    codeDrawer,
    palettePopover,
    customStudioPage,
    diagnosticHud,
    projectsModal,
    authModal,
    creditStoreModal,
    landingShowcase,
    router
  };
}

if (typeof document !== 'undefined' && document.getElementById('board-canvas')) {
  const app = initSpatialWorkbench();
  if (typeof window !== 'undefined') {
    window.__CIRCUITLAB_APP__ = app;
  }
}
