import { ArrowRight, BadgeCheck, CircleDollarSign, Handshake, Phone } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { LeadDialog } from "../../components/LeadDialog/LeadDialog";
import { ResponsiveImage } from "../../components/ResponsiveImage/ResponsiveImage";
import { Reveal } from "../../components/Reveal/Reveal";
import { SectionHeading } from "../../components/SectionHeading/SectionHeading";
import { companyData as company } from "../../features/company/company-data";
import { getProjects } from "../../features/catalog/catalog-repository";
import type { ImageAsset } from "../../features/catalog/catalog.types";
import type { LeadKind } from "../../features/leads/lead.types";
import styles from "./HomePage.module.css";
import { DeveloperCta } from "./components/DeveloperCta";
import { FeaturedProjects } from "./components/FeaturedProjects";
import { HeroSearch } from "./components/HeroSearch";
import { ServiceSteps } from "./components/ServiceSteps";
import { TrustMetrics } from "./components/TrustMetrics";

const projects = getProjects();
const cityPhoneHref = `tel:+${company.cityPhone.replace(/\D/g, "")}`;

const heroImage: ImageAsset = {
  src: "/media/site/hero-g-plus.webp",
  variants: [
    { url: "/media/site/hero-g-plus-480.avif", width: 480, format: "avif" },
    { url: "/media/site/hero-g-plus-480.webp", width: 480, format: "webp" },
    { url: "/media/site/hero-g-plus-960.avif", width: 960, format: "avif" },
    { url: "/media/site/hero-g-plus-960.webp", width: 960, format: "webp" },
  ],
};

const benefits = [
  { icon: CircleDollarSign, title: "Без комиссии покупателя", text: "Консультация и подбор новостройки не добавляют отдельную комиссию к покупке." },
  { icon: BadgeCheck, title: "Цены застройщика", text: "Сравниваем предложения по условиям, заявленным застройщиками в исходном каталоге." },
  { icon: Handshake, title: "Партнёрские предложения", text: "Уточняем доступные условия по выбранным проектам на момент обращения." },
] as const;

export default function HomePage() {
  const [dialogKind, setDialogKind] = useState<LeadKind | null>(null);

  return (
    <>
      <section className={styles.hero}>
        <ResponsiveImage
          alt="Современная архитектура Ярославля"
          asset={heroImage}
          className={styles.heroImage!}
          compactSourceWidth={480}
          eager
          imageClassName={styles.heroImageElement!}
          ratio="auto"
          sizes="100vw"
        />
        <div aria-hidden="true" className={styles.heroOverlay} />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Отобранные новостройки Ярославля</p>
            <h1>Весь город. Один правильный выбор.</h1>
            <p>Сравните проекты по важным параметрам и получите спокойную помощь на каждом следующем шаге.</p>
          </div>
          <HeroSearch projects={projects} />
        </div>
      </section>

      <Reveal className={styles.whiteSection}>
        <TrustMetrics projects={projects} />
      </Reveal>

      <Reveal className={styles.surfaceSection}>
        <FeaturedProjects projects={projects} />
      </Reveal>

      <Reveal className={styles.whiteSection}>
        <ServiceSteps />
      </Reveal>

      <Reveal className={styles.surfaceSection}>
        <section className={`container ${styles.sectionInner}`}>
          <SectionHeading
            description="Понятная модель работы без добавленных обещаний и скрытых цифровых показателей."
            eyebrow="Почему через нас"
            title="Условия без лишнего шума"
          />
          <div className={styles.benefits}>
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon aria-hidden="true" size={25} strokeWidth={1.55} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal className={styles.whiteSection}>
        <section aria-label="О компании" className={`container ${styles.companyInner}`}>
          <div className={styles.companyHeading}>
            <p className={styles.kicker}>О компании</p>
            <h2>Локальная команда, которая знает рынок Ярославля</h2>
            <p>«Офис продаж 76» помогает сравнивать новостройки, организовывать показы и разбираться в условиях покупки.</p>
            <Link className={styles.textLink} to="/about">
              Подробнее о компании
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <address className={styles.companyContacts}>
            <span>Директор</span>
            <strong>{company.director}</strong>
            <a href={cityPhoneHref}><Phone aria-hidden="true" size={18} />{company.cityPhone}</a>
            <a href={`mailto:${company.email}`}>{company.email}</a>
            <p>{company.address}</p>
          </address>
        </section>
      </Reveal>

      <Reveal className={styles.surfaceSection}>
        <DeveloperCta onRequest={() => setDialogKind("callback")} />
      </Reveal>

      <Reveal className={styles.whiteSection}>
        <section className={`container ${styles.finalCta}`}>
          <p className={styles.kicker}>Начнём с главного</p>
          <h2>Какая квартира подойдёт именно вам?</h2>
          <p>Расскажите о районе, бюджете и планах. Мы подготовим варианты для спокойного сравнения.</p>
          <Button onClick={() => setDialogKind("selection")} size="large">Получить подборку</Button>
        </section>
      </Reveal>

      <LeadDialog
        kind={dialogKind ?? "selection"}
        onClose={() => setDialogKind(null)}
        open={dialogKind !== null}
      />
    </>
  );
}
