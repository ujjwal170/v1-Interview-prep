/**
 * AnalyticsPage.jsx
 *
 * Per-topic charts and insights.
 *
 * Page flow:
 *  1. On mount: load all topics via listTopicsByActivity() (sorted by
 *     lastActivityAt desc) — Req 12.1
 *  2. Default to the first topic if any exist.
 *  3. When a topic is selected: load completed sessions via
 *     listCompletedSessionsForTopic(topicId, 10) and skill profile via
 *     useSkillProfile(topicId).
 *  4. Compute analytics data using the pure functions from analytics.js.
 *  5. Render charts and insights.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { useState, useEffect, useCallback } from 'react';
import { listTopicsByActivity } from '../services/topicService.js';
import { listCompletedSessionsForTopic, listSessions } from '../services/sessionService.js';
import { useSkillProfile } from '../contexts/SkillProfileContext.jsx';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import {
  getRecentSessions,
  computeScoreHistory,
  computeSubtopicLevels,
  computeSummaryCards,
  groupSubtopicsByStrength,
} from '../services/analytics.js';
import SummaryCards from '../components/analytics/SummaryCards.jsx';
import ScoreLineChart from '../components/analytics/ScoreLineChart.jsx';
import SubtopicBarChart from '../components/analytics/SubtopicBarChart.jsx';
import InsightsPanel from '../components/analytics/InsightsPanel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

// ---------------------------------------------------------------------------
// Inner component that consumes useSkillProfile for the selected topic.
// Separated so the hook is only called when a topicId is available.
// ---------------------------------------------------------------------------

function AnalyticsContent({ topicId, allSessions }) {
  const { profile, loading: profileLoading } = useSkillProfile(topicId);

  // Load completed sessions whenever the selected topic changes.
  const { data: completedSessions, loading: sessionsLoading } = useAsyncResource(
    useCallback(() => {
      if (!topicId) return Promise.resolve([]);
      return listCompletedSessionsForTopic(topicId, 10).catch((err) => {
        console.error('[AnalyticsPage] Failed to load sessions:', err);
        return [];
      });
    }, [topicId]),
    [topicId]
  );

  const isLoading = sessionsLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading analytics…" />
      </div>
    );
  }

  // Compute analytics data from pure functions
  const recentSessions = getRecentSessions(completedSessions, 10);
  const scoreHistory = computeScoreHistory(recentSessions);

  // For summary cards we use all sessions for the topic (any status)
  const topicAllSessions = allSessions
    ? allSessions.filter((s) => s.topicId === topicId)
    : [];
  const summaryCards = computeSummaryCards(topicAllSessions, profile);

  const subtopicLevels = computeSubtopicLevels(profile);
  const { strong, weak, unexplored } = groupSubtopicsByStrength(profile);

  return (
    <div className="flex flex-col gap-8">
      {/* Summary cards — Req 12.4 */}
      <section aria-labelledby="summary-heading">
        <h2
          id="summary-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--text)] opacity-60 mb-3"
        >
          Overview
        </h2>
        <SummaryCards
          totalSessions={summaryCards.totalSessions}
          totalQuestions={summaryCards.totalQuestions}
          aggregate={summaryCards.aggregate}
        />
      </section>

      {/* Score line chart — Req 12.2 / 12.6 */}
      <section aria-labelledby="score-chart-heading">
        <h2
          id="score-chart-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--text)] opacity-60 mb-3"
        >
          Score History (last 10 sessions)
        </h2>
        {recentSessions.length < 2 ? (
          /* Req 12.6 — fewer than 2 completed sessions */
          <EmptyState
            title="Not enough data yet"
            description="Complete at least 2 sessions on this topic to see the score trend."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)]">
            <ScoreLineChart data={scoreHistory} />
          </div>
        )}
      </section>

      {/* Subtopic bar chart — Req 12.3 */}
      <section aria-labelledby="subtopic-chart-heading">
        <h2
          id="subtopic-chart-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--text)] opacity-60 mb-3"
        >
          Subtopic Levels (weakest first)
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)]">
          {subtopicLevels.length === 0 ? (
            <p className="text-sm text-[var(--text)] opacity-60 py-4">
              No subtopic data yet. Complete a session to see subtopic levels.
            </p>
          ) : (
            <SubtopicBarChart subtopics={subtopicLevels} />
          )}
        </div>
      </section>

      {/* Insights panel — Req 12.5 */}
      <section aria-labelledby="insights-heading">
        <h2
          id="insights-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--text)] opacity-60 mb-3"
        >
          Insights
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)]">
          <InsightsPanel strong={strong} weak={weak} unexplored={unexplored} />
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

/**
 * AnalyticsPage
 *
 * Renders a topic picker and, once a topic is selected, delegates to
 * AnalyticsContent which owns the per-topic data loading.
 */
export default function AnalyticsPage() {
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  // Load all topics sorted by most recent activity — Req 12.1
  const { data: topics, loading: topicsLoading } = useAsyncResource(
    () => listTopicsByActivity().catch((err) => {
      console.error('[AnalyticsPage] Failed to load topics:', err);
      return [];
    }),
    []
  );

  // Default to the first topic once topics load — Req 12.1 / 12.2
  useEffect(() => {
    if (topics && topics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(topics[0].id);
    }
  }, [topics, selectedTopicId]);

  // Load all sessions once (used for summary card total count)
  const { data: allSessions } = useAsyncResource(
    () => listSessions().catch((err) => {
      console.error('[AnalyticsPage] Failed to load all sessions:', err);
      return [];
    }),
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" label="Loading topics…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-h)]">Analytics</h1>
        <p className="text-sm text-[var(--text)] opacity-70">
          Track your progress and spot trends by topic.
        </p>
      </div>

      {/* Topic picker — Req 12.1 */}
      {topics.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description="Start a practice session to see analytics here."
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          }
          action={
            <a
              href="/"
              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Go to Home
            </a>
          }
        />
      ) : (
        <>
          {/* Topic selector */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="topic-picker"
              className="text-sm font-medium text-[var(--text-h)]"
            >
              Topic
            </label>
            <select
              id="topic-picker"
              value={selectedTopicId ?? ''}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full max-w-xs rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-h)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Analytics content for the selected topic */}
          {selectedTopicId && (
            <AnalyticsContent
              key={selectedTopicId}
              topicId={selectedTopicId}
              allSessions={allSessions}
            />
          )}
        </>
      )}
    </div>
  );
}
