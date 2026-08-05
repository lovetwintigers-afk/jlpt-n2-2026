import { Link, useParams } from 'react-router-dom';
import { getQuestions, getQuiz } from '@/lib/content/queries';
import { QuizRunner } from '@/components/QuizRunner';

export function Quiz() {
  const { quizId } = useParams();
  const quiz = quizId ? getQuiz(quizId) : undefined;
  const questions = quiz ? getQuestions(quiz.questionIds) : [];

  if (!quiz) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">找不到這份測驗</h1>
        </div>
        <p className="notice">
          測驗 <code>{quizId}</code> 尚未建立。可以到 content/quizzes/ 補上這一份 JSON。
        </p>
        <p style={{ marginTop: 'var(--space-5)' }}>
          <Link to="/" className="btn btn--secondary">
            回到首頁
          </Link>
        </p>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">{quiz.title}</h1>
        </div>
        <p className="notice">這份測驗引用的題目尚未建立。</p>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">
          <Link to={`/week/${quiz.week}`}>第 {quiz.week} 週</Link>
        </p>
        <h1 className="page-header__title">{quiz.title}</h1>
      </div>

      {/* key 讓同一份測驗重做時整個重置 */}
      <QuizRunner key={quiz.id} quiz={quiz} questions={questions} />
    </>
  );
}
