import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCard } from "../../components/PropertyCard/PropertyCard";
import { getProjects } from "../../features/catalog/catalog-repository";
import { useFavorites } from "../../features/favorites/use-favorites";
import styles from "./FavoritesPage.module.css";

const projects = getProjects();

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const favoriteProjects = favorites.flatMap((slug) => {
    const project = projects.find((candidate) => candidate.slug === slug);
    return project ? [project] : [];
  });

  return (
    <section className={styles.page}>
      <div className={`container ${styles.header}`}>
        <p className={styles.eyebrow}>Сохранённые проекты</p>
        <h1>Избранное</h1>
        <p>Ваш короткий список хранится только в этом браузере.</p>
      </div>

      <div className="container">
        {favoriteProjects.length > 0 ? (
          <div className={styles.grid}>
            {favoriteProjects.map((project) => (
              <PropertyCard headingLevel={2} key={project.slug} project={project} variant="compact" />
            ))}
          </div>
        ) : (
          <section className={styles.empty}>
            <Heart aria-hidden="true" size={36} strokeWidth={1.5} />
            <h2>В избранном пока пусто</h2>
            <p>Добавляйте проекты сердцем на карточке — они останутся здесь для сравнения.</p>
            <Link to="/catalog">Перейти в каталог</Link>
          </section>
        )}
      </div>
    </section>
  );
}
