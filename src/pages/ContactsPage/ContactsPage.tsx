import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { LeadDialog } from "../../components/LeadDialog/LeadDialog";
import companySource from "../../data/company.json";
import { companyDataSchema } from "../../features/company/company.types";
import styles from "./ContactsPage.module.css";

const company = companyDataSchema.parse(companySource);
const mapQuery = encodeURIComponent("Ярославль, Победы 38/27, офис 501");
const mapUrl = `https://yandex.ru/maps/?text=${mapQuery}`;

export default function ContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className={styles.eyebrow}>Связаться с нами</p>
            <h1>Контакты</h1>
          </div>
          <p>
            Позвоните, напишите или приезжайте в офис по указанному адресу. Для разговора в удобное время можно заказать обратный звонок.
          </p>
        </div>
      </header>

      <section className={styles.contactSection}>
        <div className={`container ${styles.contactGrid}`}>
          <div className={styles.primaryContacts}>
            <a aria-label={company.cityPhone} className={styles.contactCard} href="tel:+74852955555">
              <Phone aria-hidden="true" />
              <span>
                <small>Городской телефон</small>
                <strong>{company.cityPhone}</strong>
              </span>
            </a>
            <a aria-label={company.mobilePhone} className={styles.contactCard} href="tel:+79109773737">
              <Phone aria-hidden="true" />
              <span>
                <small>Мобильный телефон</small>
                <strong>{company.mobilePhone}</strong>
              </span>
            </a>
            <a aria-label={company.email} className={styles.contactCard} href={`mailto:${company.email}`}>
              <Mail aria-hidden="true" />
              <span>
                <small>Электронная почта</small>
                <strong>{company.email}</strong>
              </span>
            </a>
          </div>

          <aside className={styles.callbackCard}>
            <p className={styles.eyebrow}>Когда удобно вам</p>
            <h2>Перезвоним и спокойно всё обсудим</h2>
            <p>Локальная демо-форма проверит заполнение, но не отправит и не сохранит ваши данные.</p>
            <button onClick={() => setDialogOpen(true)} type="button">Заказать звонок</button>
          </aside>
        </div>
      </section>

      <section className={styles.visitSection}>
        <div className={`container ${styles.visitGrid}`}>
          <div className={styles.addressCard}>
            <MapPin aria-hidden="true" />
            <p className={styles.eyebrow}>Адрес офиса</p>
            <address>{company.address}</address>
            <a href={mapUrl} rel="noreferrer" target="_blank">
              Открыть в Яндекс Картах
              <ExternalLink aria-hidden="true" size={18} />
            </a>
          </div>

          <div className={styles.messengerCard}>
            <MessageCircle aria-hidden="true" />
            <p className={styles.eyebrow}>Мессенджеры</p>
            <h2>Напишите напрямую</h2>
            <div className={styles.messengerLinks}>
              <a href={company.telegramUrl} rel="noreferrer" target="_blank">Telegram</a>
              <a href={company.maxUrl} rel="noreferrer" target="_blank">MAX</a>
            </div>
          </div>
        </div>
      </section>

      <LeadDialog kind="callback" onClose={() => setDialogOpen(false)} open={dialogOpen} />
    </article>
  );
}
