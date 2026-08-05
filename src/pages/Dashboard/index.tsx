import { useToday } from '@/state/TodayProvider';
import { getPhase } from '@/lib/date/courseCalendar';
import { BeforeStart } from './BeforeStart';
import { DuringCourse } from './DuringCourse';
import { ExamDayNotice } from './ExamDayNotice';
import { AfterExam } from './AfterExam';

/**
 * 儀表板首頁。依日期自動切換四種畫面，不需要使用者手動選。
 */
export function Dashboard() {
  const { today } = useToday();
  const phase = getPhase(today);

  switch (phase) {
    case 'before':
      return <BeforeStart today={today} />;
    case 'during':
      return <DuringCourse today={today} />;
    case 'exam-day':
      return <ExamDayNotice />;
    case 'after':
      return <AfterExam today={today} />;
  }
}
