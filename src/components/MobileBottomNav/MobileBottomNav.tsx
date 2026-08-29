import { Building2, Heart, Home, Phone } from "lucide-react";
import { NavLink } from "react-router-dom";
import companyJson from "../../data/company.json";
import { companyDataSchema } from "../../features/company/company.types";
import styles from "./MobileBottomNav.module.css";

const company = companyDataSchema.parse(companyJson);
const mobilePhoneHref = `tel:+${company.mobilePhone.replace(/\D/g, "")}`;

const items = [
  { label: "Главная", to: "/", icon: Home, end: true },
  { label: "Каталог", to: "/catalog", icon: Building2, end: false },
  { label: "Избранное", to: "/favorites", icon: Heart, end: false },
] as const;

export function MobileBottomNav() {
  return (
    <nav aria-label="Нижняя навигация" className={styles.nav}>
      {items.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          className={({ isActive }) => isActive ? styles.linkActive : styles.link}
          end={end}
          key={label}
          to={to}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
      <a className={styles.link} href={mobilePhoneHref}>
        <Phone aria-hidden="true" size={20} strokeWidth={1.8} />
        <span>Связаться</span>
      </a>
    </nav>
  );
}
