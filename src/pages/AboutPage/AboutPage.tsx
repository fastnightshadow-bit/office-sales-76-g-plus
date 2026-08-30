import { companyData as company } from "../../features/company/company-data";
import styles from "./AboutPage.module.css";

const claims = [
  {
    value: "7 лет",
    text: "По данным компании, команда работает с недвижимостью Ярославля семь лет.",
  },
  {
    value: "1000+",
    text: "Компания сообщает, что помогла продать более тысячи объектов.",
  },
  {
    value: "до 90%",
    text: "По заявлению компании, такую долю новостроек города охватывает её подбор.",
  },
];

export default function AboutPage() {
  return (
    <article className={styles.page}>
      <section aria-labelledby="about-page-title" className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className={styles.eyebrow}>О компании</p>
            <h1 id="about-page-title">{company.brand}</h1>
          </div>
          <p className={styles.lead}>
            Помогаем ориентироваться на рынке новостроек Ярославля и пройти путь от выбора объекта до сделки.
          </p>
        </div>
      </section>

      <section aria-label="Заявления компании" className={styles.claimsSection}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Опыт и охват</p>
              <h2>Что компания рассказывает о себе</h2>
            </div>
            <p className={styles.disclaimer}>
              Все показатели и описания услуг ниже — заявления компании из исходного сайта. Они не являются независимой гарантией результата.
            </p>
          </div>

          <div className={styles.claimGrid}>
            {claims.map((claim) => (
              <article className={styles.claimCard} key={claim.value}>
                <strong>{claim.value}</strong>
                <p>{claim.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.services}>
            <p>Компания заявляет об официальных отношениях с застройщиками и прямом доступе к их предложениям.</p>
            <p>Компания сообщает, что помогает с ипотекой и сопровождает оформление сделки.</p>
            <p>Компания указывает, что консультации 24/7 доступны клиентам по вопросам выбора недвижимости.</p>
          </div>
        </div>
      </section>

      <section className={styles.identitySection}>
        <div className={`container ${styles.identityGrid}`}>
          <div>
            <p className={styles.eyebrow}>Юридическая информация</p>
            <h2>Кто стоит за сервисом</h2>
          </div>
          <dl className={styles.identityList}>
            <div>
              <dt>Организация</dt>
              <dd>{company.legalName}, ИНН {company.inn}</dd>
            </div>
            <div>
              <dt>Директор</dt>
              <dd>{company.director}</dd>
            </div>
          </dl>
        </div>
      </section>
    </article>
  );
}
