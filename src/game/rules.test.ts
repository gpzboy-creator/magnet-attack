import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSpriteSheetAtlas,
  generateDefaultIsoSpriteSheetRGBA,
  keyOutChromaGreenRGBA,
  ISO_DIRECTIONS,
  ISO_ANIM_STATES,
} from './spriteExtractor.ts';
import {
  calculateCardTransferTiming,
  chooseWorkstationAction,
  shouldPickUpCameraFromDesk,
  approachVelocity,
  computePhotographerPose,
  getCameraLensScreenOffset,
  isBackFacingDirection,
  stepScaleSpring,
  resolveFloorObstacles,
  stepCrowdJoy,
  CROWD_JOY_RATE_PER_SEC,
  clampDt,
  computeSimDt,
  worldToIso,
  isoToWorld,
  angleToIsoDirection,
  calculateKillScore,
  getWaveConfig,
  computeCombinedMovementVector,
  getActiveWorkflowObjective,
  updateWorkstationChairState,
  calculateWorkstationJobTiming,
  getWorkstationSheetProgress,
  createVipEvent,
  doesShotCountForVipEvent,
  getMaxCameraCapacity,
  calculateBatchPrintBonus,
  stepWaiterPatrol,
  getUpgradeCost,
  getWorkstationSpeedMultiplier,
  getPreferredFrameForGuest,
  evaluateFramePreferenceMatch,
  calculateTargetGuestBreakdown,
  evaluateDancefloorCrowdState,
  pickNextSocialDanceSpot,
  MAGNET_DELIVERY_SLA_SEC,
  createInitialMagnetDeliveryTracker,
  stepMagnetDeliveryTracker,
  evaluateGuestJoyFromShot,
  evaluateGuestJoyFromMagnetDelivery,
  computePartyJoyTick,
} from './rules.ts';

test('pixel-by-pixel sprite sheet extractor finds all 32 active frames with tight bounding boxes and valid foot anchors on both transparent and #00FF00 chroma green sheets', () => {
  const rgbaTransparent = generateDefaultIsoSpriteSheetRGBA(512, 1024);
  const rgbaChroma = generateDefaultIsoSpriteSheetRGBA(512, 1024, {
    chromaGreen: true,
  });

  const atlasTransparent = extractSpriteSheetAtlas(rgbaTransparent, 512, 1024, 4, 8);
  const atlasChroma = extractSpriteSheetAtlas(rgbaChroma, 512, 1024, 4, 8);

  assert.equal(atlasTransparent.frames.length, 32);
  assert.equal(atlasChroma.frames.length, 32);

  for (let i = 0; i < 32; i++) {
    const frame = atlasChroma.frames[i];
    const tFrame = atlasTransparent.frames[i];

    // Chroma green (#00FF00) extraction must match transparent extraction identically
    assert.equal(frame.x, tFrame.x);
    assert.equal(frame.y, tFrame.y);
    assert.equal(frame.width, tFrame.width);
    assert.equal(frame.height, tFrame.height);
    assert.equal(frame.anchorX, tFrame.anchorX);
    assert.equal(frame.anchorY, tFrame.anchorY);

    assert.ok(ISO_DIRECTIONS.includes(frame.direction));
    assert.ok(ISO_ANIM_STATES.includes(frame.state));

    const cellX = frame.cellCol * 128;
    const cellY = frame.cellRow * 128;
    assert.ok(
      frame.x > cellX,
      `frame ${frame.id} x (${frame.x}) should trim left border`
    );
    assert.ok(
      frame.y > cellY,
      `frame ${frame.id} y (${frame.y}) should trim top border`
    );
    assert.ok(frame.width >= 20 && frame.width < 128);
    assert.ok(frame.height >= 60 && frame.height < 128);

    // Anchor must be normalized around (0.5, 1.0) representing ground-foot contact
    assert.ok(
      Math.abs(frame.anchorX - 0.5) <= 0.05,
      `frame ${frame.id} anchorX (${frame.anchorX}) should be ~0.5`
    );
    assert.equal(frame.anchorY, 1);
  }

  // Verify keyOutChromaGreenRGBA removes #00FF00 background cleanly
  const keyed = keyOutChromaGreenRGBA(rgbaChroma);
  assert.equal(keyed[0], 0);
  assert.equal(keyed[1], 0);
  assert.equal(keyed[2], 0);
  assert.equal(keyed[3], 0);
});

test('isometric coordinate round-trip and direction quantization work accurately', () => {
  const world = { x: 140, y: -60 };
  const iso = worldToIso(world.x, world.y);
  const roundTrip = isoToWorld(iso.x, iso.y);
  assert.ok(Math.abs(roundTrip.x - world.x) < 1e-6);
  assert.ok(Math.abs(roundTrip.y - world.y) < 1e-6);

  assert.equal(angleToIsoDirection(0), 'E');
  assert.equal(angleToIsoDirection(Math.PI / 4), 'SE');
  assert.equal(angleToIsoDirection(Math.PI / 2), 'S');
  assert.equal(angleToIsoDirection(Math.PI), 'W');
  assert.equal(angleToIsoDirection(-Math.PI / 2), 'N');
});

test('clamped dt and hitstop freeze simulation physics cleanly', () => {
  assert.equal(clampDt(0.25), 0.05);
  assert.equal(clampDt(-1), 0);

  const frozen = computeSimDt(0.016, 0.04);
  assert.equal(frozen.simDt, 0);
  assert.ok(Math.abs(frozen.nextHitstop - 0.024) < 1e-6);

  const active = computeSimDt(0.016, 0);
  assert.equal(active.simDt, 0.016);
  assert.equal(active.nextHitstop, 0);
});

test('scoring and multi-knob wave scaling progress deterministically with wedding magnet targets', () => {
  assert.equal(calculateKillScore('swarmer', 0), 100);
  assert.equal(calculateKillScore('charger', 6), 500);

  const w1 = getWaveConfig(1);
  const w4 = getWaveConfig(4);
  assert.ok(w4.spawnBudget > w1.spawnBudget);
  assert.ok(w4.targetMagnets > w1.targetMagnets);
  assert.ok(w1.trackDurationSec > 0);
  assert.ok(w4.enemySpeedMultiplier > w1.enemySpeedMultiplier);
  assert.ok(w4.hazardCount > w1.hazardCount);
});

test('computeCombinedMovementVector accurately handles smartphone virtual joystick and keyboard inputs', () => {
  const emptyKeys = new Set<string>();

  // Idle state
  const idle = computeCombinedMovementVector(emptyKeys, 0, 0);
  assert.equal(idle.isMoving, false);
  assert.equal(idle.normMoveX, 0);
  assert.equal(idle.normMoveY, 0);
  assert.equal(idle.moveMagnitude, 0);

  // Smartphone virtual joystick pushed straight UP (joyY = -1)
  const touchUp = computeCombinedMovementVector(emptyKeys, 0, -1);
  assert.equal(touchUp.isMoving, true);
  assert.ok(touchUp.moveMagnitude > 0.99);
  assert.equal(angleToIsoDirection(touchUp.screenAngle), 'N');
  // In world space, screen-up is negative x and negative y
  assert.ok(touchUp.normMoveX < 0);
  assert.ok(touchUp.normMoveY < 0);

  // Smartphone virtual joystick pushed straight RIGHT (joyX = 1)
  const touchRight = computeCombinedMovementVector(emptyKeys, 1, 0);
  assert.equal(touchRight.isMoving, true);
  assert.equal(angleToIsoDirection(touchRight.screenAngle), 'E');
  assert.ok(touchRight.normMoveX > 0);
  assert.ok(touchRight.normMoveY < 0);

  // Smartphone gentle analog tilt (joyX = 0.5, joyY = 0)
  const touchGentle = computeCombinedMovementVector(emptyKeys, 0.5, 0);
  assert.equal(touchGentle.isMoving, true);
  assert.ok(Math.abs(touchGentle.moveMagnitude - 0.5) < 0.01);

  // Keyboard W input (screen up) matches touch joystick up direction
  const keyUpSet = new Set(['KeyW']);
  const keyUp = computeCombinedMovementVector(keyUpSet, 0, 0);
  assert.equal(keyUp.isMoving, true);
  assert.equal(angleToIsoDirection(keyUp.screenAngle), 'N');
  assert.ok(keyUp.normMoveX < 0);
  assert.ok(keyUp.normMoveY < 0);

  // Combined input: keyboard + joystick
  const combined = computeCombinedMovementVector(new Set(['KeyD']), 0, 1);
  assert.equal(combined.isMoving, true);
  assert.equal(angleToIsoDirection(combined.screenAngle), 'SE');
});

test('active workflow objective follows the camera -> develop -> cut -> board pipeline', () => {
  const base = { photosInCamera: 0, uncutSheetsAtStation: 0, cutMagnetsInHand: 0, magnetsOnBoard: 0 };
  assert.equal(getActiveWorkflowObjective({ ...base, photosInCamera: 4 }), 'workstation_transfer');
  assert.equal(getActiveWorkflowObjective({ ...base, uncutSheetsAtStation: 4 }), 'workstation_cut');
  assert.equal(getActiveWorkflowObjective({ ...base, cutMagnetsInHand: 4 }), 'board_stick');
  assert.equal(getActiveWorkflowObjective({ ...base, magnetsOnBoard: 4 }), 'dancefloor');
});

test('workstation chair automatically seats photographer on approach, stands up when moving away, and respects standUpCooldown', () => {
  const stationPos = { x: 350, y: 35 };
  const chairPos = { x: 344, y: 69 };
  const stationRadius = 92;

  let chairState = {
    isSeated: false,
    wasNearStation: false,
    sitGraceTimer: 0,
    standUpCooldown: 0,
  };

  // 0. Far from station -> remains standing
  const farStep = updateWorkstationChairState(chairState, {
    playerPos: { x: 350, y: 200 },
    chairPos,
    stationPos,
    stationRadius,
    isMoving: false,
    isDashing: false,
    dt: 0.016,
  });
  assert.equal(farStep.nextChairState.isSeated, false);
  assert.equal(farStep.nextChairState.wasNearStation, false);
  chairState = farStep.nextChairState;

  // 1. Photographer approaches workstation -> sits on chair automatically
  const arrive = updateWorkstationChairState(chairState, {
    playerPos: { x: 320, y: 55 },
    chairPos,
    stationPos,
    stationRadius,
    isMoving: true,
    isDashing: false,
    dt: 0.016,
  });
  assert.equal(arrive.justSatDown, true);
  assert.equal(arrive.nextChairState.isSeated, true);
  assert.equal(arrive.nextChairState.wasNearStation, true);
  assert.deepEqual(arrive.nextPlayerPos, chairPos);

  chairState = arrive.nextChairState;

  // 2. Advance past brief arrival snap while idle -> stays seated on chair
  const idleSeated = updateWorkstationChairState(chairState, {
    playerPos: chairPos,
    chairPos,
    stationPos,
    stationRadius,
    isMoving: false,
    isDashing: false,
    dt: 0.3,
  });
  assert.equal(idleSeated.nextChairState.isSeated, true);
  chairState = idleSeated.nextChairState;

  // 3. Photographer moves -> immediately stands up from the chair and activates standUpCooldown!
  const moveAway = updateWorkstationChairState(chairState, {
    playerPos: { x: chairPos.x - 5, y: chairPos.y },
    chairPos,
    stationPos,
    stationRadius,
    isMoving: true,
    isDashing: false,
    dt: 0.016,
  });
  assert.equal(moveAway.justStoodUp, true);
  assert.equal(moveAway.nextChairState.isSeated, false);
  assert.ok(moveAway.nextChairState.standUpCooldown > 0);
  chairState = moveAway.nextChairState;

  // 4. Attempting to re-enter immediately while standUpCooldown > 0 does not re-seat
  chairState = { ...chairState, wasNearStation: false };
  const prematureReturn = updateWorkstationChairState(chairState, {
    playerPos: chairPos,
    chairPos,
    stationPos,
    stationRadius,
    isMoving: true,
    isDashing: false,
    dt: 0.05,
  });
  assert.equal(prematureReturn.nextChairState.isSeated, false);
});

test('workstation printing and cutting timing scales at 0.5 seconds per 4 photos (1 sheet)', () => {
  const zero = calculateWorkstationJobTiming(0);
  assert.equal(zero.sheetCount, 0);
  assert.equal(zero.totalDurationSec, 0);

  // 1 to 4 photos = 1 sheet = 0.5s (500ms)
  const four = calculateWorkstationJobTiming(4);
  assert.equal(four.sheetCount, 1);
  assert.equal(four.totalDurationSec, 0.5);
  assert.equal(four.durationMs, 500);

  // 5 to 8 photos = 2 sheets = 1.0s (1000ms)
  const eight = calculateWorkstationJobTiming(8);
  assert.equal(eight.sheetCount, 2);
  assert.equal(eight.totalDurationSec, 1.0);
  assert.equal(eight.durationMs, 1000);

  // 10 photos = 3 sheets = 1.5s (1500ms)
  const ten = calculateWorkstationJobTiming(10);
  assert.equal(ten.sheetCount, 3);
  assert.equal(ten.totalDurationSec, 1.5);
  assert.equal(ten.durationMs, 1500);

  // Sheet progress halfway through sheet 1 of 2 (remaining = 0.75s out of 1.0s)
  const prog1 = getWorkstationSheetProgress(0.75, 1.0, 2);
  assert.equal(prog1.currentSheet, 1);
  assert.equal(prog1.completedSheets, 0);
  assert.ok(Math.abs(prog1.sheetProgress - 0.5) < 1e-6);

  // Sheet progress halfway through sheet 2 of 2 (remaining = 0.25s out of 1.0s)
  const prog2 = getWorkstationSheetProgress(0.25, 1.0, 2);
  assert.equal(prog2.currentSheet, 2);
  assert.equal(prog2.completedSheets, 1);
  assert.ok(Math.abs(prog2.sheetProgress - 0.5) < 1e-6);
});

test('VIP moments, SD card capacity/batch bonus, roaming waiters, equipment upgrades, and magnet frame preferences work accurately', () => {
  // 1. VIP Moment creation and shot detection
  const evToast = createVipEvent(0);
  assert.equal(evToast.kind, 'table_toast');
  assert.equal(evToast.targetTableId, 1);
  assert.equal(
    doesShotCountForVipEvent(evToast, { x: -215, y: -105, role: 'table_guest', tableId: 1 }),
    true
  );
  assert.equal(
    doesShotCountForVipEvent(evToast, { x: 0, y: 0, role: 'dancer' }),
    false
  );

  const evHora = createVipEvent(1);
  assert.equal(evHora.kind, 'hora_frenzy');
  assert.equal(
    doesShotCountForVipEvent(evHora, { x: 20, y: -10, role: 'dancer' }),
    true
  );

  // 2. Camera SD card capacity & batch bonus
  assert.equal(getMaxCameraCapacity(0), 12);
  assert.equal(getMaxCameraCapacity(2), 24);
  assert.equal(calculateBatchPrintBonus(4, 12).multiplier, 1.0);
  assert.equal(calculateBatchPrintBonus(8, 12).multiplier, 1.5);
  assert.equal(calculateBatchPrintBonus(12, 12).multiplier, 2.0);

  // Waiter patrol step
  const wStep = stepWaiterPatrol(
    {
      id: 1,
      x: 0,
      y: 0,
      waypointIdx: 0,
      waypoints: [{ x: 100, y: 0 }, { x: 0, y: 0 }],
      speed: 50,
      trayItem: 'champagne',
      bumpCooldown: 0.5,
    },
    0.1
  );
  assert.ok(wStep.nextWaiter.x > 0);
  assert.ok(Math.abs(wStep.nextWaiter.bumpCooldown - 0.4) < 1e-6);

  // 3. Equipment upgrades & speed multiplier
  assert.equal(getUpgradeCost('turbo_station', 0), 500);
  assert.equal(getUpgradeCost('turbo_station', 1), 850);
  const spdMult = getWorkstationSpeedMultiplier(2);
  assert.ok(spdMult > 1.5);
  const turboJob = calculateWorkstationJobTiming(8, 2.0);
  assert.equal(turboJob.sheetCount, 2);
  assert.equal(turboJob.totalDurationSec, 0.5);

  // 4. Magnet frame styles & table preferences
  assert.equal(getPreferredFrameForGuest({ role: 'table_guest', tableId: 3 }), 'rose');
  assert.equal(getPreferredFrameForGuest({ role: 'table_guest', tableId: 4 }), 'vip');
  const matchRose = evaluateFramePreferenceMatch('rose', { role: 'table_guest', tableId: 3 });
  assert.equal(matchRose.matched, true);
  assert.equal(matchRose.scoreMultiplier, 1.5);
});

test('dancefloor vs seated guest ratio maintains 80% dancing / 10% seated / 10% recruiting at high joy and shifts against dancers when party joy drops', () => {
  // With 20 guests at high party joy (85%): 16 dancers (80%), 2 recruiters (10%), 2 seated (10%)
  const highJoy = calculateTargetGuestBreakdown(20, 85);
  assert.equal(highJoy.targetDancers, 16);
  assert.equal(highJoy.targetSeated, 2);
  assert.equal(highJoy.targetRecruiters, 2);
  assert.equal(highJoy.targetDancerPct, 80);
  assert.equal(highJoy.targetSeatedPct, 10);
  assert.equal(highJoy.targetRecruiterPct, 10);

  const healthyCrowd = evaluateDancefloorCrowdState(16, 2, 2, 85);
  assert.equal(healthyCrowd.dancerPct, 80);
  assert.equal(healthyCrowd.seatedPct, 10);
  assert.equal(healthyCrowd.recruitingPct, 10);
  assert.equal(healthyCrowd.isRatioReversed, false);
  assert.equal(healthyCrowd.isWarningZone, false);

  // When the party becomes boring (partyJoy = 20), ratio flips to 80% seated, 10% dancing
  const lowJoy = calculateTargetGuestBreakdown(20, 20);
  assert.equal(lowJoy.targetSeated, 16);
  assert.equal(lowJoy.targetDancers, 2);
  assert.equal(lowJoy.targetSeatedPct, 80);
  assert.equal(lowJoy.targetDancerPct, 10);

  const reversedCrowd = evaluateDancefloorCrowdState(3, 1, 16, 25);
  assert.equal(reversedCrowd.isRatioReversed, true);

  // Social cluster spot picker keeps partners close together in a cluster
  const centers = [
    { x: -35, y: -25 },
    { x: 35, y: -25 },
    { x: -35, y: 35 },
    { x: 35, y: 35 },
  ];
  const partnerA = pickNextSocialDanceSpot({
    clusterCenters: centers,
    currentClusterIdx: 0,
    memberSlot: 1,
    hasPartner: true,
    isPartnerSecond: false,
    switchCluster: true,
  });
  const partnerB = pickNextSocialDanceSpot({
    clusterCenters: centers,
    currentClusterIdx: 0,
    memberSlot: 1,
    hasPartner: true,
    isPartnerSecond: true,
    switchCluster: true,
  });
  assert.equal(partnerA.nextClusterIdx, 1);
  assert.equal(partnerB.nextClusterIdx, 1);
  const pairDist = Math.hypot(partnerA.spotX - partnerB.spotX, partnerA.spotY - partnerB.spotY);
  assert.ok(pairDist > 15 && pairDist < 30);
});

test('guest joy depends on photographing the right active event and delivering magnets to the board on time', () => {
  const vipEvt = createVipEvent(0); // table_toast at Table 1

  // 1. Photographing the RIGHT event gives high joy (+12 base, +15 with matching frame)
  const rightShot = evaluateGuestJoyFromShot({
    activeVipEvent: vipEvt,
    isRightEventShot: true,
    isFrameMatched: true,
    revivedSeatedGuest: false,
  });
  assert.equal(rightShot.isRightEvent, true);
  assert.equal(rightShot.joyDelta, 15);

  // Photographing a WRONG target while an event is active gives minimal joy (+1)
  const wrongShot = evaluateGuestJoyFromShot({
    activeVipEvent: vipEvt,
    isRightEventShot: false,
    isFrameMatched: false,
    revivedSeatedGuest: false,
  });
  assert.equal(wrongShot.isRightEvent, false);
  assert.equal(wrongShot.joyDelta, 1);

  // 2. Magnet Delivery SLA Timer starts when photos enter the pipeline and counts down
  let tracker = createInitialMagnetDeliveryTracker();
  assert.equal(tracker.urgencyLevel, 'idle');

  const step1 = stepMagnetDeliveryTracker(tracker, 4, 5.0);
  tracker = step1.nextState;
  assert.equal(tracker.pendingCount, 4);
  assert.equal(tracker.remainingSec, MAGNET_DELIVERY_SLA_SEC - 5);
  assert.equal(tracker.isLate, false);

  // Delivering magnets ON TIME (express tier) gives huge Guest Joy boost & score bonus
  const expressDelivery = evaluateGuestJoyFromMagnetDelivery({
    batchCount: 4,
    deliveryTracker: tracker,
  });
  assert.equal(expressDelivery.tier, 'express');
  assert.ok(expressDelivery.joyDelta >= 40);
  assert.equal(expressDelivery.scoreBonus, 400);

  // If the photographer delays past the 22s SLA window, tracker marks delivery as LATE
  const stepLate = stepMagnetDeliveryTracker(tracker, 4, 20.0);
  assert.equal(stepLate.justBecameLate, true);
  assert.equal(stepLate.nextState.isLate, true);
  assert.equal(stepLate.nextState.urgencyLevel, 'late');

  const lateDelivery = evaluateGuestJoyFromMagnetDelivery({
    batchCount: 4,
    deliveryTracker: stepLate.nextState,
  });
  assert.equal(lateDelivery.tier, 'late');
  assert.equal(lateDelivery.scoreBonus, 0);
  assert.ok(lateDelivery.joyDelta < expressDelivery.joyDelta);

  // 3. Missing a VIP event or letting magnet delivery become late penalizes Guest Joy
  const missedEvtTick = computePartyJoyTick({
    currentJoy: 85,
    dt: 1.0,
    isMagnetDeliveryLate: false,
    justBecameLate: false,
    justMissedVipEvent: true,
  });
  assert.ok(missedEvtTick.nextJoy <= 67);
  assert.ok(missedEvtTick.joyPenaltyReasonHe?.includes('פספסת'));
});



test('stepCrowdJoy caps how fast the crowd vibe follows a sudden joy jump', () => {
  const after = stepCrowdJoy(40, 88, 0.1);
  assert.ok(Math.abs(after - (40 + CROWD_JOY_RATE_PER_SEC * 0.1)) < 1e-9);
  assert.equal(stepCrowdJoy(70, 70.1, 0.1), 70.1);
});

test('a +48 joy spike changes the seated target by at most 1 guest per second', () => {
  let crowd = 40;
  let prevSeated = calculateTargetGuestBreakdown(20, crowd).targetSeated;
  for (let t = 0; t < 20; t += 1) {
    crowd = stepCrowdJoy(crowd, 88, 1);
    const seated = calculateTargetGuestBreakdown(20, crowd).targetSeated;
    assert.ok(prevSeated - seated <= 1, `jumped from ${prevSeated} to ${seated}`);
    prevSeated = seated;
  }
});

test('resolveFloorObstacles pushes a body out of circles and boxes and leaves free space alone', () => {
  const obs = [
    { kind: 'circle' as const, x: 0, y: 0, r: 30 },
    { kind: 'box' as const, minX: 100, minY: 100, maxX: 200, maxY: 150 },
  ];
  const outOfCircle = resolveFloorObstacles({ x: 10, y: 0 }, 9, obs);
  assert.ok(Math.abs(Math.hypot(outOfCircle.x, outOfCircle.y) - 39) < 1e-6);

  const insideBox = resolveFloorObstacles({ x: 150, y: 104 }, 9, obs);
  assert.equal(insideBox.y, 91); // exits through the nearest (top) side

  const touchingEdge = resolveFloorObstacles({ x: 95, y: 120 }, 9, obs);
  assert.equal(touchingEdge.x, 91);

  const free = resolveFloorObstacles({ x: 300, y: 300 }, 9, obs);
  assert.deepEqual(free, { x: 300, y: 300 });
});

test('approachVelocity eases toward target and stops cleanly', () => {
  let v = 0;
  v = approachVelocity(v, 165, 1 / 60, 12, 9);
  assert.ok(v > 0 && v < 165, `should ease in, got ${v}`);
  for (let i = 0; i < 120; i++) v = approachVelocity(v, 165, 1 / 60, 12, 9);
  assert.ok(Math.abs(v - 165) < 1);
  for (let i = 0; i < 120; i++) v = approachVelocity(v, 0, 1 / 60, 12, 9);
  assert.equal(v, 0);
});

test('stepScaleSpring settles a squash back to 1', () => {
  let s = { scale: 0.9, velocity: 0 };
  for (let i = 0; i < 120; i++) s = stepScaleSpring(s.scale, s.velocity, 1 / 60);
  assert.ok(Math.abs(s.scale - 1) < 0.01);
});

test('back-facing directions put the lens behind the body; others in front', () => {
  for (const d of ['N', 'NE', 'NW'] as const) {
    assert.equal(isBackFacingDirection(d), true);
    assert.equal(getCameraLensScreenOffset(d, 100).lensInFront, false);
  }
  for (const d of ['S', 'SE', 'SW', 'E', 'W'] as const) {
    assert.equal(getCameraLensScreenOffset(d, 100).lensInFront, true);
  }
  // Lens sits at eye level and shifts toward the facing side
  const east = getCameraLensScreenOffset('E', 100);
  assert.ok(east.dx > 0 && east.dy < -80);
  assert.ok(getCameraLensScreenOffset('W', 100).dx < 0);
});

test('photographer pose bobs while walking and breathes only when idle', () => {
  const walking = computePhotographerPose({ strideDist: 11, speedRatio: 1, idleTime: 0, lean: 0 });
  assert.ok(walking.bobY < -1);
  assert.equal(walking.breathScaleY, 1);
  const idle = computePhotographerPose({ strideDist: 0, speedRatio: 0, idleTime: 1.3, lean: 0 });
  assert.equal(idle.bobY === 0 || Object.is(idle.bobY, -0), true);
  assert.notEqual(idle.breathScaleY, 1);
});

test('card transfer timing scales with photo count and turbo upgrade', () => {
  const four = calculateCardTransferTiming(4);
  const twelve = calculateCardTransferTiming(12);
  assert.ok(twelve.totalDurationSec > four.totalDurationSec);
  assert.ok(Math.abs(four.totalDurationSec - (0.6 + 4 * 0.12)) < 0.01);
  assert.ok(calculateCardTransferTiming(12, 2).totalDurationSec < twelve.totalDurationSec);
});

test('camera is picked up from the desk only after the copy, off the chair, at the station', () => {
  const base = { cameraOnDesk: true, transferRemainingSec: 0, isSeatedAtStation: false, isNearStation: true };
  assert.equal(shouldPickUpCameraFromDesk(base), true);
  assert.equal(shouldPickUpCameraFromDesk({ ...base, transferRemainingSec: 0.4 }), false);
  assert.equal(shouldPickUpCameraFromDesk({ ...base, isSeatedAtStation: true }), false);
  assert.equal(shouldPickUpCameraFromDesk({ ...base, isNearStation: false }), false);
  assert.equal(shouldPickUpCameraFromDesk({ ...base, cameraOnDesk: false }), false);
});

test('workstation [E] picks cut > print > transfer, and reports a running copy', () => {
  const idle = { isTransferring: false, uncutSheetsAtStation: 0, photosOnComputer: 0, photosInCamera: 0 };
  assert.equal(chooseWorkstationAction(idle), 'none');
  assert.equal(chooseWorkstationAction({ ...idle, photosInCamera: 5 }), 'transfer');
  assert.equal(chooseWorkstationAction({ ...idle, photosInCamera: 5, photosOnComputer: 3 }), 'print');
  assert.equal(chooseWorkstationAction({ ...idle, photosOnComputer: 3, uncutSheetsAtStation: 2 }), 'cut');
  assert.equal(chooseWorkstationAction({ ...idle, isTransferring: true, photosOnComputer: 3 }), 'busy_transfer');
});

test('workflow objective routes camera photos to the transfer step first', () => {
  const base = { photosInCamera: 0, photosOnComputer: 0, uncutSheetsAtStation: 0, cutMagnetsInHand: 0, magnetsOnBoard: 0 };
  assert.equal(getActiveWorkflowObjective({ ...base, photosInCamera: 4 }), 'workstation_transfer');
  assert.equal(getActiveWorkflowObjective({ ...base, photosInCamera: 4, photosOnComputer: 4 }), 'workstation_develop');
});
