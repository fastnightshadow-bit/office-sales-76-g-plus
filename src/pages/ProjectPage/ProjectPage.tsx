import { ExternalLink, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { LeadDialog } from "../../components/LeadDialog/LeadDialog";
import { ResponsiveImage } from "../../components/ResponsiveImage/ResponsiveImage";
import {
  getProjectBySlug,
  getProjects,
} from "../../features/catalog/catalog-repository";
import { getProjectDetailBySlug } from "../../features/catalog/project-detail-repository";
import type { Project } from "../../features/catalog/catalog.types";
import { useFavorites } from "../../features/favorites/use-favorites";
import { Seo } from "../../seo/Seo";
import { getNotFoundSeo, getProjectSeo } from "../../seo/seo-config";
import styles from "./ProjectPage.module.css";
import { ProjectFacts } from "./components/ProjectFacts";
import { ProjectGallery } from "./components/ProjectGallery";
import { ProjectLayouts } from "./components/ProjectLayouts";
import { PurchasePrograms } from "./components/PurchasePrograms";
import { RelatedProjects } from "./components/RelatedProjects";

const projects = getProjects();

interface ProjectDocumentsProps {
  project: Project;
}

export function ProjectDocuments({ project }: ProjectDocumentsProps) {
  if (project.documents.length === 0) return null;

  return (
    <section className={styles.section} id="documents">
      <div className="container">
        <div className={styles.sectionHeading}>
          <p>Источник проекта</p>
          <h2>Документы</h2>
        </div>
        <div className={styles.documentList}>
          {project.documents.map((document, index) => (
            document.status === "verified" ? (
              <a
                className={styles.documentLink}
                href={document.url}
                key={`${document.title}-${index}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>{document.title}</span>
                <ExternalLink aria-hidden="true" size={20} />
              </a>
            ) : (
              <div className={styles.documentUnavailable} key={`${document.title}-${index}`}>
                <strong>{document.title}</strong>
                <span>Документ временно недоступен</span>
                <a href={project.sourceUrl} rel="noopener noreferrer" target="_blank">Проверить на странице проекта</a>
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectNotFound() {
  return (
    <section className={styles.notFound}>
      <div className="container">
        <p>Каталог</p>
        <h1>Проект не найден</h1>
        <Link to="/catalog">Вернуться к проектам</Link>
      </div>
    </section>
  );
}

export default function ProjectPage() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [leadOpen, setLeadOpen] = useState(false);
  const [detail, setDetail] = useState<Project | undefined>();
  const project = getProjectBySlug(slug);
  const projectDetail = detail?.slug === slug ? detail : undefined;
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    let current = true;
    setDetail(undefined);
    if (project) void getProjectDetailBySlug(slug).then((loaded) => {
      if (current) setDetail(loaded);
    });
    return () => {
      current = false;
    };
  }, [project, slug]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target && "scrollIntoView" in target) target.scrollIntoView({ block: "start" });
  }, [location.hash, projectDetail, slug]);

  const anchorBase = useMemo(() => {
    const query = new URLSearchParams(searchParams);
    const suffix = query.toString();
    return `${location.pathname}${suffix ? `?${suffix}` : ""}`;
  }, [location.pathname, searchParams]);

  if (!project) {
    return (
      <>
        <Seo {...getNotFoundSeo(location.pathname)} />
        <ProjectNotFound />
      </>
    );
  }

  const favorite = isFavorite(project.slug);
  const anchorItems = [
    { id: "description", label: "Описание", visible: (projectDetail?.description.length ?? 0) > 0 },
    { id: "documents", label: "Документы", visible: (projectDetail?.documents.length ?? 0) > 0 },
    { id: "photos", label: "Фотографии", visible: (projectDetail?.gallery.length ?? 0) > 0 },
    { id: "layouts", label: "Планировки", visible: (projectDetail?.layouts.length ?? 0) > 0 },
  ].filter(({ visible }) => visible);

  return (
    <>
      <Seo {...getProjectSeo(project)} />
      <article className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <Link className={styles.backLink} to="/catalog">Каталог / {project.district ?? "Ярославль"}</Link>
            <h1>{project.title}</h1>
            {project.shortDescription ? <p className={styles.lead}>{project.shortDescription}</p> : null}
            <div className={styles.heroActions}>
              <button className={styles.primaryAction} onClick={() => setLeadOpen(true)} type="button">
                Записаться на показ
              </button>
              <button
                aria-label={favorite ? `Убрать ${project.title} из избранного` : `Добавить ${project.title} в избранное`}
                aria-pressed={favorite}
                className={styles.favoriteAction}
                onClick={() => toggle(project.slug)}
                type="button"
              >
                <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} size={21} />
                {favorite ? "В избранном" : "В избранное"}
              </button>
            </div>
          </div>
          <ResponsiveImage
            alt={`Фасад проекта ${project.title}`}
            {...(project.coverImage ? { asset: project.coverImage } : {})}
            className={styles.heroMedia!}
            compactSourceWidth={480}
            eager
            imageClassName={styles.heroImage!}
            ratio="16 / 11"
            sizes="(max-width: 767px) calc(100vw - 40px), 56vw"
          />
        </div>
        <div className={`container ${styles.factsWrap}`}>
          <ProjectFacts project={project} />
        </div>
      </section>

      {anchorItems.length > 0 ? (
        <nav aria-label="Разделы проекта" className={styles.anchorNav}>
          <div className={`container ${styles.anchorInner}`}>
            {anchorItems.map(({ id, label }) => <a href={`${anchorBase}#${id}`} key={id}>{label}</a>)}
          </div>
        </nav>
      ) : null}

      {projectDetail && projectDetail.description.length > 0 ? (
        <section className={`${styles.section} ${styles.descriptionSection}`} id="description">
          <div className={`container ${styles.descriptionGrid}`}>
            <div className={styles.sectionHeading}>
              <p>Подробности</p>
              <h2>О проекте</h2>
            </div>
            <div className={styles.descriptionCopy}>
              {projectDetail.description.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
            </div>
          </div>
        </section>
      ) : null}

      {projectDetail ? (
        <>
          <PurchasePrograms features={projectDetail.features} programs={projectDetail.purchasePrograms} />
          <ProjectDocuments project={projectDetail} />
          <ProjectGallery images={projectDetail.gallery} title={project.title} />
          <ProjectLayouts layouts={projectDetail.layouts} />
        </>
      ) : null}
      <RelatedProjects project={project} projects={projects} />

      <aside className={styles.freshness}>
        <div className="container">
          <p>Данные сохранены из источника проекта и могут измениться.</p>
          <a href={project.sourceUrl} rel="noopener noreferrer" target="_blank">Открыть источник</a>
        </div>
      </aside>

      <div className={styles.mobileCta}>
        <button aria-label="Записаться на показ — фиксированная кнопка" onClick={() => setLeadOpen(true)} type="button">Записаться на показ</button>
      </div>

      <LeadDialog
        kind="viewing"
        onClose={() => setLeadOpen(false)}
        open={leadOpen}
        projectTitle={project.title}
      />
      </article>
    </>
  );
}
