import { Link } from "react-router-dom";
import companyJson from "../../data/company.json";
import { companyDataSchema } from "../../features/company/company.types";
import { DemoNotice } from "../DemoNotice/DemoNotice";
import styles from "./SiteFooter.module.css";

const company = companyDataSchema.parse(companyJson);
const cityPhoneHref = `tel:+${company.cityPhone.replace(/\D/g, "")}`;
const mobilePhoneHref = `tel:+${company.mobilePhone.replace(/\D/g, "")}`;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.primary}>
          <div>
            <p className={styles.brand}>{company.brand}</p>
            <p className={styles.positioning}>
              Новостройки Ярославля без комиссии и наценки для покупателя.
            </p>
          </div>

          <div className={styles.contacts}>
            <a href={cityPhoneHref}>{company.cityPhone}</a>
            <a href={mobilePhoneHref}>{company.mobilePhone}</a>
            <a href={`mailto:${company.email}`}>{company.email}</a>
          </div>
        </div>

        <nav aria-label="Навигация в подвале" className={styles.links}>
          <Link to="/catalog">Каталог</Link>
          <Link to="/about">О компании</Link>
          <Link to="/contacts">Контакты</Link>
          <Link to="/privacy">Конфиденциальность</Link>
          <Link to="/consent">Согласие</Link>
        </nav>

        <DemoNotice compact />

        <div className={styles.legalLine}>
          <span>{company.legalName}, ИНН {company.inn}</span>
          <span>Демонстрация не является публичным сайтом компании</span>
        </div>
      </div>
    </footer>
  );
}
