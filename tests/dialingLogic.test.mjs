import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWithinCallingHours,
  calculateRetrySchedule,
  calculateNextAction,
  getNextLead,
} from '../src/lib/nextBestAction.ts';

describe('Auto-Dialer Calling Rules & Logic Tests', () => {
  describe('Calling Hours Boundary Enforcement', () => {
    it('permits calls between 09:00 and 17:59', () => {
      const morning = new Date();
      morning.setHours(10, 0, 0, 0);
      assert.equal(isWithinCallingHours(morning), true);

      const afternoon = new Date();
      afternoon.setHours(17, 30, 0, 0);
      assert.equal(isWithinCallingHours(afternoon), true);
    });

    it('rejects calls before 09:00 or at/after 18:00', () => {
      const early = new Date();
      early.setHours(8, 59, 59, 0);
      assert.equal(isWithinCallingHours(early), false);

      const evening = new Date();
      evening.setHours(18, 0, 0, 0);
      assert.equal(isWithinCallingHours(evening), false);

      const night = new Date();
      night.setHours(21, 0, 0, 0);
      assert.equal(isWithinCallingHours(night), false);
    });
  });

  describe('Disposition Retry Backoff & Exhaustion', () => {
    it('schedules retry with exponential backoff on NO_RESPONSE', () => {
      const attempt1 = calculateRetrySchedule('NO_RESPONSE', 1);
      assert.equal(attempt1.shouldExhaust, false);
      assert.equal(attempt1.retryDelayHours, 2);

      const attempt2 = calculateRetrySchedule('NO_RESPONSE', 2);
      assert.equal(attempt2.shouldExhaust, false);
      assert.equal(attempt2.retryDelayHours, 6);
    });

    it('exhausts lead after 3 failed NO_RESPONSE attempts', () => {
      const attempt3 = calculateRetrySchedule('NO_RESPONSE', 3);
      assert.equal(attempt3.shouldExhaust, true);
      assert.equal(attempt3.nextStage, 'UNQUALIFIED');
    });

    it('immediately exhausts WRONG_NUMBER without retry', () => {
      const wrong = calculateRetrySchedule('WRONG_NUMBER', 1);
      assert.equal(wrong.shouldExhaust, true);
      assert.equal(wrong.retryDelayHours, null);
      assert.equal(wrong.nextStage, 'UNQUALIFIED');
    });

    it('immediately closes NOT_INTERESTED without retry', () => {
      const notInterested = calculateRetrySchedule('NOT_INTERESTED', 1);
      assert.equal(notInterested.shouldExhaust, true);
      assert.equal(notInterested.nextStage, 'CLOSED');
    });
  });

  describe('Next Best Lead Decision Engine', () => {
    it('prioritizes overdue follow-up leads above all others', () => {
      const overdueTime = new Date(Date.now() - 3600 * 1000);
      const leads = [
        {
          id: 'lead-new',
          name: 'New Lead',
          mobile: '9876543210',
          source: 'BULK',
          priority: 'HIGH',
          status: 'NEW',
          currentStage: 'NEW',
        },
        {
          id: 'lead-overdue',
          name: 'Overdue Lead',
          mobile: '9876543211',
          source: 'BULK',
          priority: 'LOW',
          status: 'CONTACTED',
          currentStage: 'QUALIFIED',
          nextFollowUp: overdueTime,
        },
      ];

      const recommendation = getNextLead(leads);
      assert.equal(recommendation.reason, 'OVERDUE');
      assert.equal(recommendation.lead?.id, 'lead-overdue');
    });

    it('prioritizes today follow-ups over new uncontacted leads', () => {
      const today = new Date();
      today.setHours(today.getHours() + 1);

      const leads = [
        {
          id: 'lead-new',
          name: 'New Lead',
          mobile: '9876543210',
          source: 'BULK',
          priority: 'HIGH',
          status: 'NEW',
          currentStage: 'NEW',
        },
        {
          id: 'lead-today',
          name: 'Today Follow-up',
          mobile: '9876543211',
          source: 'BULK',
          priority: 'MEDIUM',
          status: 'CONTACTED',
          currentStage: 'QUALIFIED',
          nextFollowUp: today,
        },
      ];

      const recommendation = getNextLead(leads);
      assert.equal(recommendation.reason, 'FOLLOW_UP_TODAY');
      assert.equal(recommendation.lead?.id, 'lead-today');
    });

    it('prioritizes HIGH priority over MEDIUM priority for new leads', () => {
      const leads = [
        {
          id: 'lead-med',
          name: 'Med Lead',
          mobile: '9876543210',
          source: 'BULK',
          priority: 'MEDIUM',
          status: 'NEW',
          currentStage: 'NEW',
          createdAt: new Date(),
        },
        {
          id: 'lead-high',
          name: 'High Lead',
          mobile: '9876543211',
          source: 'BULK',
          priority: 'HIGH',
          status: 'NEW',
          currentStage: 'NEW',
          createdAt: new Date(),
        },
      ];

      const recommendation = getNextLead(leads);
      assert.equal(recommendation.reason, 'NEW');
      assert.equal(recommendation.lead?.id, 'lead-high');
    });
  });
});
