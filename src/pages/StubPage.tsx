import { Link } from 'react-router-dom';

/**
 * 尚未建置頁面的暫時內容。
 * 明確說明「還沒做」而不是顯示假資料或空白畫面。
 */
export function StubPage({
  title,
  plannedIn,
  description,
}: {
  title: string;
  /** 預計在哪個開發階段完成 */
  plannedIn: string;
  description: string;
}) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__desc">{description}</p>
      </div>

      <div className="stub">
        <p className="stub__title">此頁尚未建置</p>
        <p>預計於{plannedIn}完成。</p>
        <p style={{ marginTop: 'var(--space-5)' }}>
          <Link to="/" className="btn btn--secondary">
            回到首頁
          </Link>
        </p>
      </div>
    </>
  );
}
