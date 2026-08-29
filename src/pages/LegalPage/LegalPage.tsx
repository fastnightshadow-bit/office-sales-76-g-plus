import legalSource from "../../data/legal.json";
import { legalDocumentsSchema, type LegalDocument } from "../../features/company/company.types";
import styles from "./LegalPage.module.css";

const legalDocuments = legalDocumentsSchema.parse(legalSource);
const reviewWarning = "Материал перенесён из действующего сайта и требует подтверждения оператора перед публикацией.";

interface LegalPageProps {
  kind: LegalDocument["kind"];
}

export default function LegalPage({ kind }: LegalPageProps) {
  const document = legalDocuments.find((item) => item.kind === kind);

  if (!document) return null;

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <p className={styles.eyebrow}>Юридическая информация</p>
          <h1>{document.title}</h1>
          <p className={styles.intro}>
            Текст приведён по материалам действующего сайта и опубликован здесь только для предварительного ознакомления.
          </p>
        </div>
      </header>

      <div className={`container ${styles.contentGrid}`}>
        <aside className={styles.reviewNotice} aria-label="Статус юридической проверки">
          <p className={styles.noticeTitle}>Материал ожидает юридической проверки</p>
          <p>{reviewWarning}</p>
          <a href={document.sourceUrl} rel="noreferrer" target="_blank">Открыть исходный документ</a>
        </aside>

        <section aria-label={document.title} className={styles.document}>
          {document.paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 28)}`}>{paragraph}</p>
          ))}
        </section>
      </div>
    </article>
  );
}
