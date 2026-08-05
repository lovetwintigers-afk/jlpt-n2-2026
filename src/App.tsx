import { Routes, Route, Navigate } from 'react-router-dom';
import { TodayProvider } from '@/state/TodayProvider';
import { ProgressProvider } from '@/state/ProgressProvider';
import { AppShell } from '@/components/Layout/AppShell';
import { Settings } from '@/pages/Settings';
import { Quiz } from '@/pages/Quiz';
import { Mistakes } from '@/pages/Mistakes';
import { Dashboard } from '@/pages/Dashboard';
import { WeekMap } from '@/pages/WeekMap';
import { WeekDetail } from '@/pages/WeekDetail';
import { DayDetail } from '@/pages/DayDetail';
import { ExamDay } from '@/pages/ExamDay';
import { StubPage } from '@/pages/StubPage';
import type { IsoDate } from '@/lib/date/courseCalendar';
import type { ProgressRepository } from '@/lib/progress/repository';
import type { ProgressSnapshot } from '@/lib/progress/schema';

export function App({
  today,
  repository,
  initialSnapshot,
}: {
  today?: IsoDate;
  repository?: ProgressRepository;
  initialSnapshot?: ProgressSnapshot;
}) {
  return (
    <TodayProvider overrideToday={today}>
      <ProgressProvider repository={repository} initialSnapshot={initialSnapshot}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<WeekMap />} />
          <Route path="week/:week" element={<WeekDetail />} />
          <Route path="week/:week/day/:day" element={<DayDetail />} />
          <Route path="exam-day" element={<ExamDay />} />

          <Route
            path="vocabulary"
            element={
              <StubPage
                title="語彙"
                plannedIn="語彙與文法階段"
                description="N2 高頻語彙、漢字讀音，含振假名與繁中解釋。"
              />
            }
          />
          <Route
            path="grammar"
            element={
              <StubPage
                title="文法"
                plannedIn="語彙與文法階段"
                description="N2 核心文法與易混淆文法比較表。"
              />
            }
          />
          <Route
            path="reading"
            element={
              <StubPage
                title="讀解"
                plannedIn="讀解與聽解階段"
                description="短篇、中長篇、資訊搜尋，含限時模式。"
              />
            }
          />
          <Route
            path="listening"
            element={
              <StubPage
                title="聽解"
                plannedIn="讀解與聽解階段"
                description="課題理解、即時應答等題型，含原文對照。"
              />
            }
          />
          <Route path="quiz/:quizId" element={<Quiz />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route
            path="weakness"
            element={
              <StubPage
                title="弱點分析"
                plannedIn="弱點與成績階段"
                description="四項能力的正確率比較與最弱項目。"
              />
            }
          />
          <Route
            path="progress"
            element={
              <StubPage
                title="學習進度與成績"
                plannedIn="弱點與成績階段"
                description="每週完成率、歷次模擬考成績變化。"
              />
            }
          />
          <Route path="settings" element={<Settings />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </ProgressProvider>
    </TodayProvider>
  );
}
