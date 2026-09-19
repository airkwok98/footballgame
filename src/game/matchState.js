/**
 * Soccer Pinball 3D - Core Match Loop & State Machine (VS03-B)
 * 
 * Deterministic match loop managing transitions:
 * BOOT -> READY -> COUNTDOWN -> PLAYING -> GOAL_PAUSE -> ROUND_COMPLETE -> PROMOTION / DEFEAT / CHAMPION
 */

(function(root) {
    'use strict';

    const MATCH_STATE = Object.freeze({
        BOOT: 'BOOT',
        READY: 'READY',
        COUNTDOWN: 'COUNTDOWN',
        PLAYING: 'PLAYING',
        GOAL_PAUSE: 'GOAL_PAUSE',
        ROUND_COMPLETE: 'ROUND_COMPLETE',
        PROMOTION: 'PROMOTION',
        DEFEAT: 'DEFEAT',
        CHAMPION: 'CHAMPION'
    });

    class MatchLoop {
        constructor() {
            this.state = MATCH_STATE.BOOT;
            this.previousState = null;

            // Countdown parameters
            this.countdownValue = 3;
            this.countdownStepDuration = 0.65; // seconds per count (3 -> 2 -> 1)
            this.goDisplayDuration = 0.45;     // seconds to display GO
            this.countdownTimer = 0;
            this.countdownActive = false;

            // Goal/Drain Pause parameters
            this.goalPauseTimer = 0;
            this.lastGoalType = null; // 'player' | 'cpu'

            // Pending kickoff data (holding initial velocities until GO)
            this.pendingKickoff = null;

            // External hooks / callbacks wired to engine
            this.hooks = {
                onStateChange: null,
                onCountdownTick: null,
                onCountdownEnd: null,
                onKickoffRelease: null,
                onGoalPauseEnd: null,
                onPrepareNextKickoff: null,
                onStageWin: null,
                onStageLose: null,
                onAdvanceStage: null,
                onRetryStage: null,
                onRestartCareer: null,
                onStartEndless: null,
                getScoreP1: () => 0,
                getScoreCPU: () => 0,
                getTargetScore: () => 3,
                getCurrentStage: () => 0,
                getMaxStage: () => 7
            };
        }

        init(hooks = {}) {
            Object.assign(this.hooks, hooks);
            this.setState(MATCH_STATE.BOOT);
        }

        getState() {
            return this.state;
        }

        is(state) {
            return this.state === state;
        }

        canPlay() {
            return this.state === MATCH_STATE.PLAYING;
        }

        canScore() {
            return this.state === MATCH_STATE.PLAYING;
        }

        canDefendersAct() {
            return this.state === MATCH_STATE.PLAYING;
        }

        setState(newState) {
            if (this.state === newState) return;
            const oldState = this.state;
            this.previousState = oldState;
            this.state = newState;
            if (this.hooks.onStateChange) {
                this.hooks.onStateChange(newState, oldState);
            }
        }

        // Ready state: pitch and assets loaded, awaiting user start
        setReady() {
            this.setState(MATCH_STATE.READY);
        }

        // User starts match from READY
        start() {
            if (this.state !== MATCH_STATE.READY) return false;
            return this.startKickoffCountdown();
        }

        // Prepare ball and scene for kickoff (ball fixed, velocities queued)
        prepareKickoff(kickoffData) {
            this.pendingKickoff = kickoffData || null;
        }

        // Begin 3-2-1-GO kickoff countdown
        startKickoffCountdown() {
            if (this.state === MATCH_STATE.PROMOTION || 
                this.state === MATCH_STATE.DEFEAT || 
                this.state === MATCH_STATE.CHAMPION) {
                return false;
            }
            this.setState(MATCH_STATE.COUNTDOWN);
            this.countdownValue = 3;
            this.countdownTimer = this.countdownStepDuration;
            this.countdownActive = true;
            if (this.hooks.onCountdownTick) {
                this.hooks.onCountdownTick(3);
            }
            return true;
        }

        // Goal scored by player
        handlePlayerGoal() {
            if (this.state !== MATCH_STATE.PLAYING) return false;
            this.setState(MATCH_STATE.GOAL_PAUSE);
            this.lastGoalType = 'player';
            this.goalPauseTimer = 1.70; // syncs with celebration and net physics
            return true;
        }

        // Goal scored by CPU (drain)
        handleCpuGoal() {
            if (this.state !== MATCH_STATE.PLAYING) return false;
            this.setState(MATCH_STATE.GOAL_PAUSE);
            this.lastGoalType = 'cpu';
            this.goalPauseTimer = 1.25;
            return true;
        }

        // Frame tick for deterministic countdown & pause progress
        update(dt) {
            // 1. Kickoff countdown state
            if (this.state === MATCH_STATE.COUNTDOWN && this.countdownActive) {
                this.countdownTimer -= dt;
                if (this.countdownTimer <= 0) {
                    if (this.countdownValue === 3) {
                        this.countdownValue = 2;
                        this.countdownTimer = this.countdownStepDuration;
                        if (this.hooks.onCountdownTick) this.hooks.onCountdownTick(2);
                    } else if (this.countdownValue === 2) {
                        this.countdownValue = 1;
                        this.countdownTimer = this.countdownStepDuration;
                        if (this.hooks.onCountdownTick) this.hooks.onCountdownTick(1);
                    } else if (this.countdownValue === 1) {
                        this.countdownValue = 0; // 'GO'
                        this.countdownTimer = this.goDisplayDuration;
                        if (this.hooks.onCountdownTick) this.hooks.onCountdownTick('GO');
                        this.releaseKickoff();
                    } else if (this.countdownValue === 0) {
                        this.countdownActive = false;
                        if (this.hooks.onCountdownEnd) this.hooks.onCountdownEnd();
                    }
                }
            }

            // 2. Goal pause state
            if (this.state === MATCH_STATE.GOAL_PAUSE) {
                this.goalPauseTimer -= dt;
                if (this.goalPauseTimer <= 0) {
                    this.resolveGoalPause();
                }
            }
        }

        releaseKickoff() {
            this.setState(MATCH_STATE.PLAYING);
            if (this.hooks.onKickoffRelease) {
                this.hooks.onKickoffRelease(this.pendingKickoff);
            }
        }

        resolveGoalPause() {
            if (this.hooks.onGoalPauseEnd) {
                this.hooks.onGoalPauseEnd();
            }

            const p1 = this.hooks.getScoreP1();
            const cpu = this.hooks.getScoreCPU();
            const target = this.hooks.getTargetScore();
            const stage = this.hooks.getCurrentStage();
            const maxStage = this.hooks.getMaxStage();

            if (p1 >= target) {
                this.setState(MATCH_STATE.ROUND_COMPLETE);
                if (stage >= maxStage) {
                    this.setState(MATCH_STATE.CHAMPION);
                    if (this.hooks.onStageWin) this.hooks.onStageWin(true);
                } else {
                    this.setState(MATCH_STATE.PROMOTION);
                    if (this.hooks.onStageWin) this.hooks.onStageWin(false);
                }
            } else if (cpu >= target) {
                this.setState(MATCH_STATE.ROUND_COMPLETE);
                this.setState(MATCH_STATE.DEFEAT);
                if (this.hooks.onStageLose) this.hooks.onStageLose();
            } else {
                if (this.hooks.onPrepareNextKickoff) {
                    this.hooks.onPrepareNextKickoff();
                }
                this.startKickoffCountdown();
            }
        }

        skipCountdown() {
            if (this.state === MATCH_STATE.COUNTDOWN) {
                this.countdownValue = 0;
                this.countdownTimer = 0;
                this.countdownActive = false;
                this.releaseKickoff();
                if (this.hooks.onCountdownEnd) this.hooks.onCountdownEnd();
            }
        }

        advanceStage() {
            if (this.state !== MATCH_STATE.PROMOTION) return false;
            this.state = MATCH_STATE.BOOT; // lock immediate re-entry
            if (this.hooks.onAdvanceStage) {
                this.hooks.onAdvanceStage();
            }
            return true;
        }

        retryStage() {
            if (this.state !== MATCH_STATE.DEFEAT) return false;
            this.state = MATCH_STATE.BOOT; // lock immediate re-entry
            if (this.hooks.onRetryStage) {
                this.hooks.onRetryStage();
            }
            return true;
        }

        restartCareer() {
            if (this.state !== MATCH_STATE.CHAMPION) return false;
            this.state = MATCH_STATE.BOOT; // lock immediate re-entry
            if (this.hooks.onRestartCareer) {
                this.hooks.onRestartCareer();
            }
            return true;
        }

        startEndless() {
            if (this.state !== MATCH_STATE.CHAMPION) return false;
            this.state = MATCH_STATE.BOOT; // lock immediate re-entry
            if (this.hooks.onStartEndless) {
                this.hooks.onStartEndless();
            }
            return true;
        }
    }

    const rootObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
    rootObj.MATCH_STATE = MATCH_STATE;
    rootObj.MatchLoop = MatchLoop;
    rootObj.matchLoop = new MatchLoop();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MATCH_STATE, MatchLoop, matchLoop: rootObj.matchLoop };
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
