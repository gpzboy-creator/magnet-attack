/**
 * The hall crowd: who sits at the tables and who dances (moved out of IsoArenaCanvas.tsx).
 *
 * A smoothed crowd vibe (`crowdJoy`) follows the party joy; when it is high, seated guests get up
 * and dancers recruit the ones still sitting, and when it drops, bored dancers go back to their seats.
 */

import type { WeddingGuestActor } from './guestActor.ts';
import type { GuestsState } from './gameState.ts';
import {
  CROWD_MOVE_INTERVAL_SEC,
  GUEST_ACTIVITY_COOLDOWN_SEC,
  calculateTargetGuestBreakdown,
  stepCrowdJoy,
} from './rules.ts';

/** One frame of the sit / dance / recruit controller. */
export function stepCrowd(
  crowd: Pick<GuestsState, 'crowdJoy' | 'crowdMoveCooldown'>,
  guests: WeddingGuestActor[],
  partyJoy: number,
  dt: number,
  rng: () => number = Math.random
) {
    // ====================================================================
    // DYNAMIC 80% DANCING / 10% SEATED / 10% RECRUITING RATIO CONTROLLER
    // - At high Party Joy: 80% dance in place in social groups, 10% sit, 10% pull seated guests
    // - When Party Joy drops ("אם המסיבה מבאסת"), dancers leave the floor to sit at tables!
    // ====================================================================
    crowd.crowdJoy = stepCrowdJoy(crowd.crowdJoy, partyJoy, dt);
    crowd.crowdMoveCooldown = Math.max(0, crowd.crowdMoveCooldown - dt);
    for (const g of guests) {
      if ((g.activityCooldown ?? 0) > 0) {
        g.activityCooldown = Math.max(0, (g.activityCooldown ?? 0) - dt);
      }
    }
    const targetBreakdown = calculateTargetGuestBreakdown(guests.length, crowd.crowdJoy);
    const currentSeated = guests.filter((g) => g.guestActivity === 'seated');
    const currentDancers = guests.filter((g) => g.guestActivity === 'dancing');
    const activeFloorDancers = currentDancers.filter((g) => !g.isEnteringFloor);

    // If the party is getting boring and fewer guests are seated than targetSeated,
    // a dancer gets disappointed and walks back to their table seat!
    const boredDancer =
      currentSeated.length < targetBreakdown.targetSeated &&
      activeFloorDancers.length > 2 &&
      crowd.crowdMoveCooldown <= 0
        ? activeFloorDancers.find(
            (g) =>
              !g.seekingMagnet &&
              g.celebrateTimer <= 0 &&
              (g.activityCooldown ?? 0) <= 0
          )
        : undefined;
    // Only guests who actually reached their chair and haven't just sat down may get up again
    const hypedSeated =
      currentSeated.length > targetBreakdown.targetSeated && crowd.crowdMoveCooldown <= 0
        ? currentSeated.find(
            (g) => g.isSeated && !g.seekingMagnet && (g.activityCooldown ?? 0) <= 0
          )
        : undefined;

    if (boredDancer && rng() < dt * 0.95) {
      crowd.crowdMoveCooldown = CROWD_MOVE_INTERVAL_SEC;
      boredDancer.activityCooldown = GUEST_ACTIVITY_COOLDOWN_SEC;
      {
        boredDancer.guestActivity = 'seated';
        boredDancer.isSeated = true;
        boredDancer.role = 'table_guest';
        boredDancer.danceMove = boredDancer.id % 2 === 0 ? 'eating' : 'toasting';
        boredDancer.homeX = boredDancer.seatX ?? boredDancer.homeX;
        boredDancer.homeY = boredDancer.seatY ?? boredDancer.homeY;
        boredDancer.speechBubbleText =
          partyJoy < 45
            ? 'נהיה מבאס ברחבה... הולך לשבת בשולחן 🥱'
            : 'הולך לנוח קצת בשולחן... צלמו אותנו! 🪑';
        boredDancer.wantsPhotoTimer = 3.0;
      }
    } else if (hypedSeated && rng() < dt * 1.2) {
      // Party Joy is high! Seated guests get hyped and walk back onto the dance floor with a staggered delay!
      crowd.crowdMoveCooldown = CROWD_MOVE_INTERVAL_SEC;
      hypedSeated.activityCooldown = GUEST_ACTIVITY_COOLDOWN_SEC;
      {
        const maxQueuedDelay = guests.reduce(
          (maxD, g) => Math.max(maxD, g.arrivalDelayTimer ?? 0),
          0
        );
        hypedSeated.guestActivity = 'dancing';
        hypedSeated.role = 'dancer';
        hypedSeated.danceMove = 'bounce';
        hypedSeated.homeX = hypedSeated.danceSpotX ?? 0;
        hypedSeated.homeY = hypedSeated.danceSpotY ?? 0;
        hypedSeated.isEnteringFloor = true;
        hypedSeated.arrivalDelayTimer = maxQueuedDelay + 0.8 + rng() * 1.7;
        hypedSeated.speechBubbleText = 'איזה קצב מטורף! חוזר לרקוד ברחבה! 💃🔥';
        hypedSeated.wantsPhotoTimer = 2.6;
      }
    }

    // Ensure ~10% of guests (targetRecruiters) actively walk to tables to drag seated guests up!
    const updatedSeated = guests.filter((g) => g.guestActivity === 'seated');
    const updatedRecruiters = guests.filter((g) => g.guestActivity === 'recruiting');
    const desiredRecruiters = Math.min(
      updatedSeated.length,
      Math.max(1, targetBreakdown.targetRecruiters)
    );
    if (updatedRecruiters.length < desiredRecruiters && activeFloorDancers.length > 2) {
      const unrecruitedSeat = updatedSeated.find(
        (s) => !updatedRecruiters.some((r) => r.recruitTargetId === s.id)
      );
      const candidate = activeFloorDancers.find(
        (d) => !d.seekingMagnet && d.guestActivity === 'dancing'
      );
      if (unrecruitedSeat && candidate) {
        candidate.guestActivity = 'recruiting';
        candidate.isSeated = false;
        candidate.role = 'dancer';
        candidate.recruitTargetId = unrecruitedSeat.id;
        candidate.recruitProgressTimer = 0;
        candidate.danceMove = 'wave';
        candidate.speechBubbleText = '🙌 בוא לרקוד!';
        candidate.wantsPhotoTimer = 1.3;
      }
    }
}
