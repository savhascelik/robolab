/**
 * English (EN) Locale Dictionary for Learn Arduino & Embedded 3D Lab.
 */
export const enLocale = {
  meta: {
    code: 'en',
    label: 'EN',
    name: 'English'
  },
  ui: {
    brand: {
      title: 'Learn Arduino',
      subtitle: 'Explore · Understand · Build'
    },
    nav: {
      home: 'Home',
      lessons: 'Lessons',
      parts: 'Components',
      simulator: 'Simulator',
      usb: 'WebUSB Flash',
      settings: 'Settings'
    },
    status: {
      basics: 'Curriculum',
      lessonsHeading: 'Lessons'
    },
    viewbar: {
      hint: 'Drag / WASD to pan · Q / E to rotate · Scroll to zoom',
      turnLeft: 'Turn left (Q)',
      turnRight: 'Turn right (E)',
      zoomOut: 'Zoom out (−)',
      zoomIn: 'Zoom in (+)',
      resetView: 'Reset view (R)'
    },
    tabs: {
      overview: 'Overview',
      pinout: 'Pinout',
      example: 'Circuit',
      specs: 'Specifications'
    },
    info: {
      pinoutHeading: 'Pinout Connections',
      circuitHeading: 'How the Circuit Works',
      circuitTip:
        'Tip: Click the Play button (or press Space) to compile and run the sketch on the 3D board!',
      specsHeading: 'Technical Specifications'
    },
    code: {
      title: 'Try it yourself',
      serialMonitor: 'Serial Monitor (9600 baud)',
      statusStopped: 'Stopped',
      statusUploading: 'Uploading…',
      statusRunning: 'Running',
      statusFlashingUsb: 'USB Flashing…',
      btnUsbTitle: 'Connect & Flash Real Board via Browser USB (WebSerial)',
      btnUsbLabel: 'USB Flash',
      btnUsbConnected: 'USB Connected'
    },
    controls: {
      hardwareInput: 'Hardware Input',
      pin2Switch: 'Pin 2 Switch:',
      pressAndHold: 'Press & Hold',
      pressedLow: 'PRESSED (LOW)',
      potentiometerTitle: 'Potentiometer (ADC)',
      targetDistance: 'Target Distance',
      pwmSpeed: 'PWM Speed (Pin 6)'
    },
    flyout: {
      allLessons: 'All Lessons ({count})',
      hardwareRegistry: '3D Hardware Registry ({count})',
      settingsTitle: 'Stage, Language & USB Settings',
      langTitle: 'Interface Language: {lang}',
      langDesc: 'Switch all lessons, callouts, and UI panels between Turkish (TR) and English (EN)',
      hostAutoTitle: 'Host Board: Auto (Per Lesson)',
      hostAutoDesc: 'Uses Arduino Uno R3 for Lessons 1–8 and ESP32 DevKit V1 for Lesson 9',
      hostUnoTitle: 'Force Host: Arduino Uno R3 (5V AVR)',
      hostUnoDesc: 'ATmega328P • 5.0V Logic • 10-bit ADC (0–1023) • STK500v1 USB',
      hostEsp32Title: 'Force Host: ESP32 DevKit V1 (3.3V Wi-Fi)',
      hostEsp32Desc: 'ESP-WROOM-32 • 3.3V Logic • 12-bit ADC (0–4095) • Esptool SLIP USB',
      usbFlashTitle: 'Browser WebSerial USB Flasher ({protocol})',
      usbFlashDesc: 'Compile & flash active lesson directly to physical MCU over browser USB',
      gridTitle: 'Isometric Floor Grid: {state}',
      gridDesc: 'Toggle technical drafting grid lines',
      soundTitle: 'Web Audio Synthesizer: {state}',
      soundDesc: 'Toggle Piezo Buzzer tone() sound output',
      catalogDockTitle: 'Component Catalog Layout: {dock}',
      catalogDockDesc: 'Position the component catalog as Center Modal, Left Panel, Right Panel, or Bottom Shelf',
      openCatalogTitle: 'Open 3D Component Catalog',
      openCatalogDesc: 'Add unlimited independent boards, sensors, motors, LEDs, and buttons onto the stage',
      openSettingsModalTitle: '⚙️ Open Central Settings & Cloud Profile Modal',
      openSettingsModalDesc: 'Configure pin visibility mode, nearest-class drag highlighting, and user profile sync',
      stateOn: 'ON',
      stateOff: 'OFF'
    },
    settings: {
      modalTitle: '⚙️ Central Settings & User Profile',
      modalSubtitle: 'Preferences persist locally and automatically hydrate in the background when logged in',
      close: 'Close',
      resetBtn: '↺ Reset to Defaults',
      sectionWiring: '🔌 Smart Wiring & Pin Visibility',
      pinVisTitle: 'Pin / Connection Point Visibility Mode',
      pinVisDesc: 'Choose when pin handles and input/output labels appear on 3D components',
      pinVisPinHover: '🎯 Only on Hovered Pin (Default)',
      pinVisPinHoverDesc: 'Hovering a component hides clutter; only the specific input/pin under the cursor reveals its label',
      pinVisCompHover: '📦 Show All Component Inputs',
      pinVisCompHoverDesc: 'Displays all connected and available input/output pins of the hovered or selected component',
      pinVisAlways: '🌐 Always Show All Stage Pins',
      pinVisAlwaysDesc: 'Keeps all pin badges visible across all stage components continuously',
      nearestDragTitle: 'Colorize Nearest Same-Class Pins on Drag',
      nearestDragDesc: 'When dragging a wire, highlights and colors the nearest connectable pins of the same electrical class',
      sectionStage: '🎛️ Stage, Language & Catalog Preferences',
      sectionCloud: '☁️ User Session & Backend Profile Sync',
      cloudStatusLocal: 'Local Profile (Guest / Offline)',
      cloudStatusSyncing: 'Syncing Cloud Profile…',
      cloudStatusSynced: 'Synced with Cloud Profile ({user})',
      cloudLoginSimulateBtn: '☁️ Hydrate Cloud Profile (Login Sync Test)',
      cloudLogoutBtn: 'Sign Out'
    },
    catalog: {
      openBtn: 'Component Catalog',
      title: '3D Component Catalog & Stage Manager',
      subtitle: 'Add unlimited independent components onto the stage and drag them freely across the desk',
      searchPlaceholder: 'Search component, sensor, motor, board or category…',
      dockLabel: 'Layout',
      dockModal: 'Center Modal',
      dockLeft: 'Left Panel',
      dockRight: 'Right Panel',
      dockBottom: 'Bottom Shelf',
      close: 'Close',
      addBtn: '+ Add to Stage',
      spawnBtn: '+ Add to Stage',
      onStageCount: 'On Stage: {count}',
      instanceCount: 'On Stage: {count}',
      activeInstancesTitle: 'Active Stage Components ({count})',
      activeStageTitle: 'Active Stage Components ({count})',
      selectBtn: 'Select / Move',
      duplicateBtn: 'Duplicate',
      removeBtn: 'Remove',
      noResults: 'No components matched your search.',
      emptySearch: 'No components matched your search.',
      categories: {
        all: 'All',
        boards: 'Boards & Breadboard',
        leds: 'LEDs & Light',
        passives: 'Passives',
        buttons: 'Buttons & Switches',
        sensors: 'Sensors & Cameras',
        audio: 'Audio & Buzzer',
        motors: 'Motors & Gimbals',
        drivers: 'Motor Drivers',
        power: 'Power & LiPo Packs',
        displays: 'OLED & Displays',
        robotics: 'Robotics & Chassis',
        props: 'Obstacles & Stage Props'
      }
    },
    gizmo: {
      title: 'Tabletop Drag & 3D Gizmo',
      hudTitle: 'Tabletop Move',
      positionLabel: 'Position',
      tableDragHint: '🖐 Grab and drag any component directly across the tabletop surface',
      hint: 'Drag X (Red) · Y (Green) · Z (Blue) axes, XZ table plane, or RY rotation ring',
      snapOn: 'Snap: 2.54mm',
      snapOff: 'Snap: Free',
      snapToggle: 'Snap: {state}',
      axesToggle: '3D Gizmo Axes: {state}',
      rotate45: 'Rotate 45°',
      rotate90: '↻ Rotate 90°',
      duplicate: 'Duplicate',
      delete: 'Delete',
      deselect: 'Deselect'
    }
  },
  stage: {
    wiring: {
      quick_connect: '🔗 Quick Connect',
      smart_connect: '⚡ Smart Connect',
      quick_connect_active:
        '⚡ Smart Connect Active ({source}) — Click target components sequentially to wire with {source} (ESC to exit)',
      smart_connect_paired: '✓ Connected: {from} → {to}',
      connect_to_label: 'Connect to Stage Component',
      magnet_snapped: 'Breadboard Magnet: {pins}',
      disconnect_all: 'Disconnect All',
      auto_wire: '⚡ Auto-Wire',
      wire_deleted: 'Wire removed',
      delete_wire_title: 'Delete Wire'
    }
  },
  elec: {
    wiring: {
      err: {
        short_circuit: 'Direct power-to-ground short circuit blocked!',
        power_conflict: 'Conflicting voltage rails cannot be tied together!',
        overvoltage: 'Target pin max voltage exceeded (5V → 3.3V)!',
        no_free_pins: 'No free compatible pins remaining between these two components.',
        incompatible: 'Selected pins are electrically incompatible.',
        invalid_pin: 'Invalid pin endpoint.',
        same_pin: 'A pin cannot be wired to itself.'
      }
    }
  },
  callouts: {
    usb: {
      label: 'USB Port',
      desc: 'Connects the board to your computer to upload sketches and supply 5V USB power.'
    },
    jack: {
      label: 'Power Jack',
      desc: 'Accepts a 7–12V DC barrel adapter or battery pack for standalone projects.'
    },
    digital: {
      label: 'Digital Pins',
      desc: 'Pins 0–13 read or write HIGH (5V) / LOW (0V). Pins marked ~ support PWM.'
    },
    mcu: {
      label: 'Microcontroller',
      desc: 'ATmega328P — the 8-bit AVR brain running your compiled C++ loop at 16 MHz.'
    },
    power: {
      label: 'Power Pins',
      desc: 'Provides regulated 5V, 3.3V and GND rails to power breadboard circuits.'
    },
    analog: {
      label: 'Analog Pins',
      desc: 'Pins A0–A5 read continuous voltages (0–5V) as 10-bit numbers (0–1023).'
    },
    wroom: {
      label: 'ESP-WROOM-32 SoC',
      desc: '240 MHz Dual-Core Xtensa LX6 32-bit microprocessor with 520 KB SRAM & 4 MB Flash under an RF shield.'
    },
    antenna: {
      label: '2.4 GHz Wi-Fi / BLE Antenna',
      desc: 'Onboard gold meander PCB trace antenna supporting 802.11 b/g/n Wi-Fi and Bluetooth 4.2 + BLE.'
    },
    esp_usb: {
      label: 'Micro-USB Port',
      desc: 'Supplies 5V power and flashes firmware at up to 921,600 baud via the CP2102 bridge.'
    },
    cp2102: {
      label: 'CP2102 & 3.3V LDO',
      desc: 'Silicon Labs USB-to-UART bridge + AMS1117-3.3 regulator converting 5V USB down to 3.3V logic.'
    },
    buttons: {
      label: 'EN & BOOT Buttons',
      desc: 'EN resets the SoC; holding BOOT (GPIO0) enters serial bootloader flashing mode.'
    },
    gpio: {
      label: '30-Pin Multiplexed GPIO',
      desc: '3.3V pins with 12-bit SAR ADC (0–4095), 16 PWM LEDC channels, capacitive touch, I2C, SPI & DAC.'
    },
    jetson_heatsink: {
      label: '128-Core Maxwell GPU & Heatsink Block',
      desc: 'Quad-Core ARM Cortex-A57 + 128-core NVIDIA Maxwell SoM delivering 472 GFLOPS Edge AI inference under an anodized aluminum heatsink.'
    },
    jetson_gpio: {
      label: 'J41 40-Pin 3.3V GPIO Header',
      desc: 'Linux sysfs / Jetson.GPIO compatible I2C, SPI, UART, PWM and 3.3V CMOS logic pins (strictly not 5V tolerant!).'
    },
    jetson_csi: {
      label: 'MIPI CSI-2 Camera Connector',
      desc: 'High-speed MIPI CSI-2 ribbon camera bus for real-time computer vision and TensorRT inference pipelines.'
    },
    jetson_ports: {
      label: 'Gigabit Ethernet & 4× USB 3.0 Stack',
      desc: 'Dual-stack USB 3.0 and RJ45 Gigabit Ethernet ports for high-bandwidth sensors, cameras, and networking.'
    },
    jetson_power: {
      label: '5V 4A Barrel Jack & Micro-USB Power',
      desc: 'Regulated 5V / 4A (20W) DC power input for sustained high-load GPU inference.'
    }
  },
  workbench: {
    topPill: {
      brand: 'CircuitLab 3D',
      boardSelectLabel: 'Active Host Board',
      noHostBoardOption: '— No Host Board (Empty Stage) —',
      flowClosedLoop: '{currentMa} mA · Closed Loop',
      flowOpenLoop: '0.0 mA · Open Circuit',
      flowFault: 'Electrical Fault ({count})',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeToggleTitle: 'Switch between Dark and Light workbench theme',
      langToggleTitle: 'Switch language (TR / EN)',
      xrayLabel: 'X-Ray',
      xrayToggleTitle: 'Toggle internal conductive dipole paths (Dipole X-Ray)',
      showcaseBtn: '3D Robot Showcase',
      showcaseBtnTitle: 'Open 3D Autonomous Sumo Robot & NVIDIA Jetson Nano Camera Robot Showcase',
      showcaseTitle: 'Open 3D Autonomous Sumo Robot & NVIDIA Jetson Nano Camera Robot Showcase',
      loginBtn: 'Sign In',
      registerBtn: 'Register',
      logoutBtn: 'Log Out',
      logoutTitle: 'Sign out of current account',
      dashboardBtn: 'My Workspaces',
      dashboardBtnTitle: 'Open your saved cloud workspaces or create a new workspace',
      autosaveSaved: 'Saved · {title}',
      autosaveSaving: 'Saving…',
      autosaveGuest: 'Guest Mode',
      authenticatedAs: '{name}'
    },
    top: {
      brand: 'CircuitLab 3D',
      board_label: 'Active Host Board',
      no_host_board: '— No Host Board (Empty Stage) —',
      closed_loop: 'Closed Loop',
      open_circuit: 'Open Circuit',
      short_circuit: 'Short Circuit / Overcurrent!',
      xray: 'X-Ray',
      xray_hint: 'Toggle internal conductive dipole paths (Dipole X-Ray)',
      showcase_btn: '3D Robot Showcase',
      login_btn: 'Sign In',
      register_btn: 'Register',
      logout_btn: 'Log Out',
      dashboard_btn: 'My Workspaces',
      autosave_saving: 'Saving…',
      autosave_saved: 'Auto-Saved',
      autosave_guest: 'Guest Mode'
    },
    dock: {
      toolSelect: 'Select / Move',
      toolWire: 'Wire',
      toolAddPart: '+ Part',
      simRun: 'Run',
      simStop: 'Stop',
      commandPlaceholder: 'Enter circuit command (e.g., "Wire ESP32 with DHT22" or "Why is the LED off?")…',
      commandSubmit: 'Apply',
      undoAiBtn: 'Undo',
      undoAiTitle: 'Undo last AI scene command',
      codeBtn: 'Code',
      codeBtnTitle: 'Open C++ / Python Code & Serial Drawer (Ctrl+E)',
      projectsBtn: 'My Workspaces & Templates',
      projectsBtnTitle: 'Personal Cloud Workspaces, 3D Reference Templates & Study Groups',
      pinSidebarTitle: 'Pin Chat to Right Sidebar',
      attachScreenshotTitle: 'Attach 3D Stage Snapshot to Chat'
    },
    aiChat: {
      title: 'Hardware Agent & Code Mode',
      subtitle: 'Search Mode · Progressive Schema · Atomic 3D Synthesis',
      roundBadge: 'Round {round}/{maxRounds}',
      roundBadgeExtended: 'Round {round}/{maxRounds} (Extended)',
      pinToSidebar: 'Pin to Sidebar',
      minimizeToDock: 'Minimize to Bottom Dock',
      clearHistory: 'Clear Chat',
      stopAgent: 'Stop',
      undoLast: '1-Click Undo',
      attachStageShot: 'Attach 3D Stage Snapshot',
      stageShotAttached: '3D Stage Snapshot Attached',
      removeStageShot: 'Remove Snapshot',
      inputPlaceholder: 'Build circuit, wire pins, or debug (e.g. "Build HC-SR04 + Servo barrier")…',
      answerPlaceholder: 'Type your answer or click one of the options above…',
      sendBtn: 'Send',
      answerBtn: 'Reply',
      stepsHeader: 'Agent Tool Steps ({count})',
      extendRoundsHeader: 'Extra Round Budget Request',
      clarificationHeader: 'Agent Awaiting Your Input',
      grant5Rounds: '+5 Rounds & Continue',
      grant10Rounds: '+10 Rounds',
      finishWithCurrent: 'Finish with Current State',
      tableComponents: 'Components',
      tableWires: 'Wires',
      tableClosedLoops: 'Closed Loops',
      tableCurrentMa: 'Total Current (mA)',
      tableStatus: 'Status',
      statusVerified: 'Verified',
      statusOpenLoop: 'Open Loop',
      statusFault: 'Short / Fault',
      emptyHint: 'Describe a hardware circuit: the agent discovers component schemas (Search Mode), then synthesizes 3D wiring and C++ firmware via CircuitSDK (Code Mode).',
      errorFallback: 'Operation could not be completed.',
      errors: {
        modelNotConfigured: 'No active AI model is configured on the system. Please add and enable an AI model in the admin panel.',
        apiKeyMissing: 'The API key for the active AI model is not configured. Please set the API key in the server or admin panel configuration.',
        providerError: 'Failed to receive a valid response from the AI provider. Please check the model connection settings and API key.',
        insufficientCredits: 'Your AI credit balance is depleted. Please top up AI credits from the credit store to continue circuit synthesis.',
        maxRoundsExceeded: 'Maximum agent round limit reached.',
        unauthenticated: 'You must sign in to use the AI hardware agent.',
        requestFailed: 'An error occurred during the AI request. Please try again.'
      }
    },
    codeDrawer: {
      title: 'Hardware Code & Live Runtime',
      subtitle: 'Edits drive 3D board pins and the CircuitFlowSolver closed-loop engine in real time',
      tabEditor: 'Code Editor',
      tabSerial: 'Serial Monitor & Pin Log',
      applyBtn: 'Upload & Run on Board',
      resetBtn: 'Reset Default Code',
      closeBtn: 'Close',
      activePinsHeading: 'Live Driven Pin States',
      serialEmpty: 'Serial.println() output and pin transitions appear here when simulation runs.',
      lineCount: '{lines} lines'
    },
    palette: {
      title: '3D Component Catalog & Datasheet Synthesizer',
      searchPlaceholder: 'Search board, sensor, motor, resistor or part number…',
      search_placeholder: 'Search board, sensor, motor, resistor or part number…',
      tabCatalog: 'Catalog ({count})',
      tab_catalog: 'Catalog ({count})',
      tabStudio: '✨ Custom Component Studio',
      tab_studio: '✨ Custom Component Studio',
      tabDatasheet: '+ Synthesize Datasheet',
      tab_datasheet: '+ Synthesize Datasheet',
      addStageBtn: '+ Add to Stage',
      spawn_btn: '+ Add to Stage',
      spawn_short_btn: '+ Add',
      previewBadge: '360° LIVE 3D PREVIEW',
      previewRotateHint: 'Slow Turntable · Drag to Spin',
      previewPinsLabel: 'Pin & Terminal Layout',
      catAll: 'All',
      catBoards: 'Boards',
      catSensors: 'Sensors',
      catMotors: 'Motors',
      catDrivers: 'Drivers',
      catPower: 'Power',
      catDisplays: 'Displays',
      catRobots: 'Robots',
      catChassis: 'Chassis',
      catLeds: 'LEDs',
      catButtons: 'Buttons',
      catPassives: 'Passives',
      catAudio: 'Audio',
      catProps: 'Props & Obstacles',
      catCustom: 'Custom Built',
      studioTitle: '3D Custom Electronic Component & Module Studio',
      studioDesc: 'Design your own electronic module or physical stage obstacle using a 3D sub-part tree (parts[]), surface mounting (attach), realistic circuit materials, 2.54mm pin headers, and signal behavior logic.',
      studioModeNode: 'Electronic Module (With Pins — Sensor / Driver / Board)',
      studioModeProp: 'Stage Object / Obstacle (No Pins)',
      studioSaveSpawnBtn: 'Save to Catalog & Spawn on Stage',
      studioRefreshPreviewBtn: 'Refresh 3D Preview',
      studioAddPartBtn: '+ Add 3D Sub-Part',
      studioAddPinBtn: '+ Add Pin',
      studioGenHeaderBtn: '+ Generate 2.54mm Pin Row',
      datasheetTitle: 'Live Datasheet / Part Synthesizer (Tavily + Nemotron)',
      datasheetDesc: 'Enter any sensor or module part number not in the catalog; its pinout, internal dipole model, and 3D package are synthesized onto the stage.',
      partInputPlaceholder: 'Part code (e.g., BME280, MPU6050, INA219, BH1750)…',
      datasheet_placeholder: 'Part code (e.g., BME280, MPU6050, INA219, BH1750)…',
      synthesizeBtn: 'Synthesize & Spawn',
      datasheet_submit: 'Synthesize & Spawn',
      synthesizingStatus: 'Scanning datasheet and building 3D package…',
      synthesizedSuccess: '{name} ({typeId}) synthesized and added to stage.'
    },
    diagnostics: {
      title: 'Electrical Fault & Topology Diagnostics',
      analyzeBtn: 'Deep Diagnosis (Nemotron)',
      fixBtn: 'Auto-Repair',
      dismissBtn: 'Dismiss',
      analyzing: 'Analyzing circuit topology…',
      healthySummary: 'All closed loops are operating within safe current and voltage limits.'
    },
    diagnostic: {
      title: 'Electrical Fault & Topology Diagnostics',
      fix_btn: 'Auto-Repair',
      dismiss: 'Dismiss'
    },
    projects: {
      title: 'Workspace Dashboard, 3D Templates & Study Groups',
      subtitle: 'Manage your personal cloud workspaces, create a new workspace, or load 3D reference robot circuits',
      close: 'Close',
      tabWorkspaces: 'My Workspaces ({count})',
      tab_workspaces: 'My Workspaces',
      tabPresets: 'Reference Templates (3)',
      tab_presets: '3D Reference Templates',
      tabGroups: 'Study Groups',
      tab_groups: 'Study Groups',
      tabAccount: 'Account & Security',
      tab_account: 'Account & Security',
      return_workbench_btn: 'Return to 3D Workbench',
      profile_section_title: 'Profile Information',
      profile_section_desc: 'Update your full name and account email address.',
      profile_save_btn: 'Save Profile Changes',
      profile_updated_toast: 'Profile information updated successfully.',
      password_section_title: 'Change Password',
      password_section_desc: 'Verify your current password to set a new account password.',
      current_password_label: 'Current Password',
      new_password_label: 'New Password',
      new_password_confirm_label: 'Confirm New Password',
      password_save_btn: 'Update Password',
      password_updated_toast: 'Your password has been updated securely.',
      plan_summary_title: 'Membership Plan, Quota & AI Credits',
      newWorkspaceHeading: 'Create New Workspace',
      newWorkspaceDesc: 'Launches a clean 3D workspace with your chosen host board and automatically saves every change to your account.',
      newWorkspaceTitlePlaceholder: 'Workspace title (e.g., Autonomous Obstacle Rover)…',
      new_workspace_title_placeholder: 'Workspace title (e.g., Autonomous Obstacle Rover)…',
      new_workspace_board_label: 'Select Host Controller Board',
      createWorkspaceBtn: '+ Create New Workspace',
      new_workspace_btn: '+ Create New Workspace',
      activeWorkspaceLabel: 'Active Workspace',
      workspace_active_badge: 'Active Workspace',
      autosaveActiveBadge: 'Auto-Save Active',
      workspace_AutoSave_hint: 'Every change on the 3D stage is automatically saved to your account.',
      saveNowBtn: 'Save Now',
      openWorkspaceBtn: 'Open Workspace',
      workspace_open_btn: 'Open Workspace',
      deleteWorkspaceBtn: 'Delete',
      workspace_delete_btn: 'Delete',
      emptyWorkspaces: 'You have no saved workspaces yet. Create a new workspace above or start building on the stage.',
      empty_workspaces: 'You have no saved workspaces yet. Create a new workspace above or start building on the stage.',
      guestDashboardTitle: 'Save Your Workspaces to Your Account',
      guest_workspace_title: 'Save Your Workspaces to Your Account',
      guestDashboardDesc: 'When signed in, every 3D circuit and code change you make is automatically saved to your personal cloud account.',
      guest_workspace_desc: 'When signed in, every 3D circuit and code change you make is automatically saved to your personal cloud account.',
      guestLoginCta: 'Sign In / Register',
      guest_login_cta: 'Sign In / Register',
      guestContinueCta: 'Continue as Guest',
      loadSceneBtn: 'Load onto Stage',
      load_btn: 'Load onto Stage',
      forkBtn: 'Fork & Edit',
      fork_btn: 'Fork & Edit',
      shareCurrentBtn: 'Share Current Stage to Group',
      share_stage_btn: 'Share Current Stage to Group',
      createGroupBtn: '+ Create Group',
      create_group_btn: '+ Create Group',
      create_group_label: 'Create New Study Group',
      joinGroupBtn: 'Join with Invite Code',
      join_group_btn: 'Join with Invite Code',
      join_group_label: 'Join Group with Invite Code',
      groupNamePlaceholder: 'Group name (e.g., Robotics Hardware Lab)…',
      group_name_placeholder: 'Group name (e.g., Robotics Hardware Lab)…',
      inviteCodePlaceholder: 'Invite code (e.g., LAB-NEBIUS26)…',
      invite_code_placeholder: 'Invite code (e.g., LAB-NEBIUS26)…',
      forkSuccess: 'Loaded "{title}" with all custom components onto the 3D stage.',
      loaded_toast: 'Loaded 3D circuit onto stage',
      workspaceCreatedSuccess: 'Workspace "{title}" created and saved to your account.',
      workspace_created_toast: 'New workspace created and saved to your account',
      workspaceSavedSuccess: 'Workspace "{title}" saved to your account.',
      workspaceDeletedSuccess: 'Workspace deleted.',
      workspace_deleted_toast: 'Workspace deleted'
    },
    guestPrompt: {
      badge: 'GUEST WORKSPACE',
      title: 'Auto-Save Your Circuit to Your Account?',
      desc: 'Sign in to automatically save your 3D circuit layout and code to your account, or continue using the workbench in guest mode.',
      loginBtn: 'Sign In / Register',
      continueBtn: 'Continue as Guest'
    },
    guest_prompt: {
      title: 'Auto-Save Your Circuit to Your Account?',
      body: 'Sign in to automatically save your 3D circuit layout and code to your account, or continue using the workbench in guest mode.',
      login_cta: 'Sign In / Register',
      continue_guest_cta: 'Continue Without Signing In'
    },
    auth: {
      title: 'CircuitLab 3D Account & Cloud Workspace',
      subtitle: 'Sign in with your account to save your 3D circuit designs in the cloud and continue your projects from anywhere.',
      close: 'Close',
      loginTab: 'Sign In',
      tab_login: 'Sign In',
      registerTab: 'Create Account',
      tab_register: 'Create Account',
      accountTab: 'My Account',
      featureCloudTitle: 'Automatic Cloud Sync',
      featureCloudDesc: 'Every board, sensor, wire, and code change on the 3D stage is automatically synced to your account.',
      featureDashboardTitle: 'Personal Workspace Dashboard',
      featureDashboardDesc: 'Create independent workspaces for your Arduino Uno, ESP32, and NVIDIA Jetson Nano projects.',
      featureAiAssistantTitle: 'Smart 3D Circuit & Code Assistant',
      featureAiAssistantDesc: 'Synthesize 3D circuits, automatic wiring, and embedded C++ firmware directly from natural language prompts.',
      securityPill: 'Secure Cloud Synchronization',
      nameLabel: 'Full Name',
      name_label: 'Full Name',
      emailLabel: 'Email Address',
      email_label: 'Email Address',
      passwordLabel: 'Password',
      password_label: 'Password',
      emailPlaceholder: 'you@example.com',
      email_placeholder: 'you@example.com',
      passwordPlaceholder: 'Password (min. 6 characters)…',
      password_placeholder: 'Password (min. 6 characters)…',
      namePlaceholder: 'Your full name…',
      name_placeholder: 'Your full name…',
      loginSubmitBtn: 'Sign In',
      login_submit: 'Sign In',
      registerSubmitBtn: 'Create Account & Start',
      register_submit: 'Create Account & Start',
      switchToRegisterText: 'Need an account? Create one →',
      switch_to_register: 'Need an account? Create one →',
      switchToLoginText: 'Already have an account? Sign in →',
      switch_to_login: 'Already have an account? Sign in →',
      logoutBtn: 'Log Out',
      logout_btn: 'Log Out',
      openDashboardBtn: 'Open My Workspaces',
      open_dashboard_cta: 'Open My Workspaces',
      verifiedSessionBadge: 'Active Account',
      session_verified_badge: 'Active Account',
      account_role_label: 'Membership Plan',
      account_credits_label: 'AI Credit Balance',
      sessionActiveBadge: 'Active Session: {name} ({email})',
      auth_success_status: 'Signed in successfully.',
      register_success_status: 'Account created and signed in.',
      logged_out_status: 'Signed out safely.',
      invalid_credentials_error: 'Invalid email or password.',
      invalidEmailError: 'Please enter a valid email address (e.g., name@domain.com).',
      invalid_email_error: 'Please enter a valid email address (e.g., name@domain.com).',
      invalidPasswordError: 'Password must be at least 6 characters.',
      short_password_error: 'Password must be at least 6 characters.',
      invalidNameError: 'Please enter your full name to register.',
      missing_name_error: 'Please enter your full name to register.'
    }
  },
  landing: {
    nav: {
      badge: 'INDUSTRIAL 3D HARDWARE & ROBOTICS LAB',
      sceneSumo: '01 · Autonomous Sumo Robot',
      sceneJetson: '02 · NVIDIA Jetson Camera Robot',
      loginBtn: 'Sign In',
      registerBtn: 'Register',
      dashboardBtn: 'My Workspaces',
      logoutBtn: 'Sign Out',
      enterWorkbenchBtn: 'Enter 3D Hardware Workbench →',
      enterWorkbench: 'Enter 3D Hardware Workbench →'
    },
    hero: {
      eyebrow: 'ZERO HARDWARE RISK · REAL-TIME 3D ELECTRONICS & ROBOTICS STUDIO',
      title: 'Design, Wire, and Test Your Robot in 3D Before Buying a Single Part.',
      subtitle: 'Eliminate burnt boards and weeks of shipping delays. Assemble authentic 3D CAD hardware, simulate live voltage and current flow, and customize production-ready robots in one click.',
      ctaLaunchWorkbench: 'Open Blank 3D Workbench',
      ctaFocusSumo: 'Scene 01: Sumo Robot',
      ctaFocusJetson: 'Scene 02: Jetson Camera Robot',
      primaryCta: 'Launch Free 3D Studio →',
      secondaryCtaSumo: 'Autonomous Sumo Robot',
      secondaryCtaJetson: 'Jetson AI Vision Rover',
      metricPhysics: 'Live Kirchhoff & Short-Circuit Guard',
      metricBoards: '30+ True-Scale 3D Components',
      metricZeroGradient: 'Zero Install · Runs Instantly in Browser'
    },
    valueStrip: {
      v1Title: '10× Faster Prototyping',
      v1Desc: 'Wire complex circuits and test embedded code in seconds without breadboard clutter or soldering.',
      v2Title: 'Zero Burnt Hardware Risk',
      v2Desc: 'Real-time electrical solver checks every pin for short circuits and voltage drops before you build.',
      v3Title: 'Customizable 3D Robot Templates',
      v3Desc: 'Open the Sumo Robot or Jetson AI Rover directly in the 3D workbench and swap sensors effortlessly.'
    },
    sumoScene: {
      sectionIndex: '01 · HIGH-TORQUE AUTONOMOUS COMBAT ARCHITECTURE',
      sceneTag: '01 · HIGH-TORQUE AUTONOMOUS COMBAT ARCHITECTURE',
      title: 'Autonomous Mini-Sumo Robot',
      subtitle: 'Competition-grade autonomous combat robotics. Hover over the key hardware highlights to separate the 3D CAD layers in real time, or open the complete circuit in the studio.',
      highlightsHint: 'HOVER OVER KEY FEATURES TO INSPECT 3D HARDWARE',
      highlights: {
        radar: {
          tag: 'SUB-MILLISECOND REFLEX',
          title: '40 kHz Ultrasonic Target Lock & Ring Edge Guard',
          desc: 'Dual HC-SR04 acoustic sonar locks onto opponents up to 400 cm away while TCRT5000 infrared arrays detect the white ring boundary for instant evasive maneuvers.',
          metric: '40 kHz Sonar · 0.3 cm Precision'
        },
        drive: {
          tag: 'MAXIMUM PUSH TORQUE',
          title: 'L298N Dual H-Bridge & 600 RPM Metal Gearmotors',
          desc: 'Delivers 2A continuous current per channel into high-torque 30:1 N20 metal spur gearboxes and silicone traction wheels for zero-slip attack acceleration.',
          metric: '2A PWM Driver · 30:1 Gearbox'
        },
        brain: {
          tag: 'LIVE CIRCUIT & CODE',
          title: 'Arduino Uno R3 & 3S LiPo Power Distribution',
          desc: 'Inspect and rewire all 14 live jumper connections, PWM speed signals, and 11.1V LiPo current paths directly inside the 3D hardware workbench.',
          metric: '16 MHz MCU · 11.1V 75C LiPo'
        }
      },
      statusApproaching: 'APPROACHING FROM DISTANCE',
      statusAssembled: 'MECHANICAL CENTER LOCK',
      statusExploded: 'EXPLODED 3D CAD VIEW',
      telemetryDistance: 'Runway Distance: {distanceMm} mm',
      telemetryExplode: 'CAD Separation: {percent}%',
      explodeSliderLabel: 'Explode Factor (CAD)',
      approachSliderLabel: 'Runway Approach Position',
      approachLabel: 'Runway Approach Position (Z: -115 → 0)',
      explodeLabel: '8-Layer CAD Explode Factor',
      bomTitle: '8 MODULAR 3D HARDWARE LAYERS (BOM)',
      btnReplayApproach: '↺ Replay Approach & Explode',
      replayApproachBtn: '↺ Replay Approach & Explode',
      btnExplodeToggle: '⤢ Explode / Reassemble CAD',
      explodeBtn: '⤢ Explode Parts (100%)',
      assembleBtn: '⤡ Reassemble (0%)',
      btnOpenInWorkbench: 'Open Sumo Robot Circuit in 3D Workbench →',
      openInWorkbenchBtn: 'Open Sumo Robot Circuit in 3D Workbench →',
      partsTitle: '8 Modular 3D Component Layers (Reusable in Workbench)',
      parts: {
        wedgeBlade: {
          title: '18° Hardened Steel Dozer Wedge Blade',
          spec: 'robotics.sumo_dozer_blade · BaseChassisPart · Precision Ground Wedge'
        },
        chassisBase: {
          title: 'CNC 6061-T6 Lower Chassis Plate & M3 Brass Standoffs',
          spec: 'robotics.sumo_chassis_plate · BaseChassisPart · Anodized Deck'
        },
        n20Drivetrain: {
          title: '4× N20 600RPM Gearmotors & Silicone Traction Wheels',
          spec: 'motor.n20_gearmotor · BaseMotor · 1:50 Brass Spur Gearbox'
        },
        l298nDriver: {
          title: 'L298N Dual H-Bridge Motor Driver',
          spec: 'driver.l298n_dual · BaseMotorDriver · 2A/Ch + Finned Heatsink'
        },
        arduinoUno: {
          title: 'Arduino Uno R3 Main Controller Board',
          spec: 'board.arduino_uno · BaseMCUBoard · ATmega328P @ 16MHz'
        },
        lipoPack: {
          title: '3S 11.1V 1300mAh 75C LiPo Battery Pack',
          spec: 'power.lipo_3s_1300mah · BasePowerModule · XT60 + JST-XH Balance'
        },
        ultrasonicArray: {
          title: 'Dual HC-SR04 Ultrasonic Opponent Rangefinders',
          spec: 'sensor.ultrasonic · BaseDistanceSensor · 40kHz Acoustic Sonar'
        },
        lineSensors: {
          title: '4× TCRT5000 IR Dohyo Edge Array & 3K Carbon Hood',
          spec: 'sensor.tcrt5000_line · BaseAnalogSensor + robotics.sumo_armor_hood'
        }
      }
    },
    jetsonScene: {
      sectionIndex: '02 · EDGE AI & AUTONOMOUS COMPUTER VISION PLATFORM',
      sceneTag: '02 · EDGE AI & AUTONOMOUS COMPUTER VISION PLATFORM',
      title: 'NVIDIA Jetson Nano AI Camera Rover',
      subtitle: 'On-device deep learning and active 3D target tracking without cloud latency. Hover over the core modules below to reveal the internal 3D hardware architecture.',
      highlightsHint: 'HOVER OVER KEY FEATURES TO INSPECT 3D HARDWARE',
      highlights: {
        ai: {
          tag: '472 GFLOPS EDGE AI',
          title: 'NVIDIA Jetson Nano & 128-Core Maxwell GPU',
          desc: 'Runs 60 FPS TensorRT object detection and 40-pin J41 GPIO hardware control simultaneously on a single low-power embedded compute module.',
          metric: '128 CUDA · FP16 TensorRT'
        },
        optics: {
          tag: 'ACTIVE 3D VISION CONE',
          title: 'Sony IMX219 160° Camera & 2-Axis Servo Gimbal',
          desc: 'Wide-angle 8MP MIPI CSI-2 optics mounted on a dual-servo pan/tilt turret automatically lock onto moving targets inside a live 3D FOV frustum.',
          metric: '160° FOV · 1080p 60FPS'
        },
        mobility: {
          tag: '360° OMNIDIRECTIONAL',
          title: 'Mecanum Omni-Drive & VL53L1X Laser ToF Shield',
          desc: 'Strafes laterally in any direction on 45° Mecanum rollers while millimeter-accurate laser Time-of-Flight ranging and OLED telemetry prevent collisions.',
          metric: '360° Vector · 940nm Laser ToF'
        }
      },
      statusScanning: 'AUTONOMOUS CAMERA TRACKING',
      statusExploded: 'JETSON CAD LAYER ANALYSIS',
      telemetryStream: 'IMX219 CSI-2 · 1280×720 @ 60 FPS · TensorRT FP16',
      telemetryGimbal: 'Gimbal: Pan {panDeg}° · Tilt {tiltDeg}°',
      explodeSliderLabel: 'Jetson CAD Explode Factor',
      panSliderLabel: 'Camera Pan Angle',
      panLabel: 'Camera Pan Angle (Yaw)',
      tiltLabel: 'Camera Tilt Angle (Pitch)',
      explodeLabel: 'Jetson CAD Explode Factor',
      bomTitle: '8 MODULAR 3D EDGE AI LAYERS (BOM)',
      autoScanBtn: 'Auto Target Tracking',
      btnToggleFov: '3D Vision Cone (FOV)',
      fovToggleBtn: '3D Vision Cone (FOV)',
      btnExplodeToggle: '⤢ Explode / Reassemble Rover',
      explodeToggleBtn: '⤢ Explode / Reassemble Rover',
      btnOpenInWorkbench: 'Open Jetson Camera Robot in 3D Workbench →',
      openInWorkbenchBtn: 'Open Jetson Camera Robot in 3D Workbench →',
      partsTitle: '8 Modular 3D Edge AI Components (Reusable in Workbench)',
      parts: {
        mecanumChassis: {
          title: '4× Mecanum Omni-Wheels & CNC Rover Chassis Deck',
          spec: 'motor.mecanum_wheel · BaseMotor + robotics.jetson_rover_chassis'
        },
        powerRegulator: {
          title: 'INA219 Dual-18650 5V/4A Buck Power & Telemetry Bay',
          spec: 'power.ina219_buck_bay · BasePowerModule · R100 Shunt + I2C'
        },
        jetsonNanoSbc: {
          title: 'NVIDIA Jetson Nano B01 Developer Kit SBC',
          spec: 'board.jetson_nano · BaseSBCBoard · 128-Core Maxwell + J41 3.3V'
        },
        panTiltGimbal: {
          title: '2-Axis Pan/Tilt MG90S Servo Camera Turret',
          spec: 'motor.pan_tilt_gimbal · BaseMotor · Dual PWM Gimbal'
        },
        imx219Camera: {
          title: 'Sony IMX219 8MP 160° MIPI CSI-2 AI Camera Module',
          spec: 'sensor.imx219_csi · BaseVisionSensor · Multi-Element Glass Lens + IR'
        },
        csiRibbon: {
          title: '15-Pin MIPI CSI-2 Flex Ribbon & I2C Bus Harness',
          spec: 'robotics.csi_ribbon_harness · BaseChassisPart · 1.5Gbps/Lane'
        },
        lidarTof: {
          title: 'VL53L1X 940nm Laser Time-of-Flight Distance Sensor',
          spec: 'sensor.vl53l1x_tof · BaseDistanceSensor · 4m Millimeter Ranging'
        },
        oledTelemetry: {
          title: '0.96" SSD1306 128×64 I2C OLED Telemetry Display',
          spec: 'display.ssd1306_oled · BaseDisplayModule · Live FPS & Bus Voltage'
        }
      }
    },
    sumo: {
      sceneCode: 'SCENE 01 // AUTONOMOUS MINI-SUMO ROBOT',
      title: 'Approach Kinematics & 8-Layer Exploded CAD Mechanical Architecture',
      subtitle: 'An autonomous mini-sumo combat robot accelerating from the far end of the dohyo ring, braking into center lock, and separating into its CNC steel wedge blade, N20 gearmotors, L298N H-bridge, Arduino Uno R3, 3S LiPo pack, and HC-SR04 ultrasonic array.',
      statusApproaching: 'APPROACHING FROM DISTANCE',
      statusLocked: 'MECHANICAL CENTER LOCK',
      statusExploded: 'EXPLODED 3D CAD VIEW',
      replayBtn: '↺ Replay Approach & Explode',
      explodeFullBtn: '⤢ Explode Parts (100%)',
      assembleBtn: '⤡ Reassemble (0%)',
      explodeSliderLabel: 'Explode Factor (CAD)',
      approachSliderLabel: 'Runway Approach Position',
      openInWorkbenchBtn: 'Open Sumo Robot Circuit in 3D Workbench →',
      telemetryDistance: 'Runway Distance: {zMm} mm',
      telemetryExplode: 'CAD Separation: {percent}%',
      telemetrySubAssemblies: '8 Sub-Assemblies · 11.1V 3S LiPo / 5V Logic'
    },
    jetson: {
      sceneCode: 'SCENE 02 // NVIDIA JETSON NANO EDGE AI CAMERA ROBOT',
      title: 'NVIDIA Jetson Nano & IMX219 CSI-2 160° Active Vision Rover',
      subtitle: 'An autonomous Edge AI vision rover powered by the 128-core Maxwell GPU, 40-pin J41 3.3V GPIO header, MIPI CSI-2 ribbon bus, and a 2-axis Pan-Tilt servo gimbal projecting a real-time 3D optical FOV frustum.',
      statusTracking: 'AUTONOMOUS CAMERA TRACKING',
      statusManual: 'MANUAL GIMBAL CONTROL',
      statusExploded: 'JETSON CAD LAYER ANALYSIS',
      toggleTrackingBtn: 'Auto Target Tracking',
      toggleFovBtn: '3D Vision Cone (FOV)',
      explodeBtn: '⤢ Explode Robot CAD',
      assembleBtn: '⤡ Reassemble Robot',
      panSliderLabel: 'Camera Pan Angle ({deg}°)',
      tiltSliderLabel: 'Camera Tilt Angle ({deg}°)',
      explodeSliderLabel: 'Jetson CAD Explode Factor',
      openInWorkbenchBtn: 'Open Jetson Camera Robot in 3D Workbench →',
      telemetryFps: 'TensorRT CSI-2: 60 FPS · 3.3V J41',
      telemetryGimbal: 'Gimbal: Pan {pan}° / Tilt {tilt}°',
      telemetrySubAssemblies: '8 Sub-Assemblies · IMX219 8MP + Mecanum Drive'
    }
  }
};
