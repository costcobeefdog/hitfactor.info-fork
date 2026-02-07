"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as PrimeMenu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { TabMenu } from "primereact/tabmenu";
import { useRef, useState, useEffect } from "react";

import features from "@shared/features";

const MoreMenu = () => {
  const loggedIn = false;
  const menu = useRef<PrimeMenu>(null);
  const itemsWithNull: (MenuItem | null)[] = [
    loggedIn
      ? {
          icon: "pi pi-user-edit",
          label: "Profile / Settings",
        }
      : null,
    loggedIn
      ? {
          icon: "pi pi-book",
          label: "Classification Record",
        }
      : null,
    {
      label: "GitHub",
      icon: "pi pi-github",
      url: "https://github.com/CodeHowlerMonkey/hitfactor.info",
      target: "_blank",
    },
    {
      separator: true,
    },
    loggedIn
      ? {
          icon: "pi pi-sign-out",
          label: "Logout",
        }
      : null,
    !loggedIn
      ? {
          icon: "pi pi-sign-in",
          label: "Login",
          url: "/api/login",
        }
      : null,
    !loggedIn
      ? {
          label: "Register",
          url: "/api/register",
        }
      : null,
  ];
  const items = itemsWithNull.filter((item): item is MenuItem => item !== null);

  return (
    <>
      <PrimeMenu
        model={items}
        popup
        ref={menu}
        popupAlignment="right"
        pt={{
          root: { className: "-mt-5", style: { overflow: "hidden" } },
          menu: { style: { width: "max-content" } },
        }}
      />
      <a
        className="flex p-menuitem-link no-highlight px-2"
        onClick={e => menu.current?.toggle(e)}
      >
        <span className="pi pi-bars text-2xl" />
      </a>
    </>
  );
};

interface NavItem {
  label: string;
  icon?: string;
  path: string;
  template?: () => React.ReactNode;
  className?: string;
  separator?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  visible?: boolean;
}

const scsaOnlyConfig: NavItem[] = [
  {
    label: "SCSA Classifiers",
    icon: "pi pi-chart-bar",
    path: "/",
  },
];

const mainConfig: NavItem[] = [
  {
    label: "Howler Monkey Classifiers",
    template: () => (
      <Link className="flex p-menuitem-link" href="/">
        <img
          alt="Howler Monkey Classifiers"
          src="/logo.png"
          style={{ maxWidth: "calc(min(12vw, 64px))" }}
        />
      </Link>
    ),
    path: "/",
  },
  {
    label: "Stats",
    icon: "pi pi-chart-pie",
    path: "/stats",
  },
  {
    label: "Classifiers",
    icon: "pi pi-chart-bar",
    path: "/classifiers",
  },
  {
    label: "Shooters",
    icon: "pi pi-users",
    path: "/shooters",
  },
  {
    label: "Uploads",
    icon: "pi pi-upload",
    path: "/upload",
  },
  {
    label: "Majors",
    icon: "pi pi-trophy",
    path: "/majors",
  },
  {
    visible: typeof window !== "undefined" && window.location.hostname === "localhost",
    label: "Reports",
    icon: "pi pi-flag",
    path: "/reports",
  },
  {
    className: "flex-grow-1",
    separator: true,
    disabled: true,
    style: { opacity: 1 },
    label: "",
    path: "",
  },
  {
    visible: !features.users,
    template: () => (
      <Link
        className="flex p-menuitem-link no-highlight px-2"
        href="https://github.com/CodeHowlerMonkey/hitfactor.info"
        target="_blank"
      >
        <span className="pi pi-github text-2xl" />
      </Link>
    ),
    label: "",
    path: "",
  },
  {
    visible: features.users,
    template: () => <MoreMenu />,
    label: "",
    path: "",
  },
];

const config = features.scsaOnly ? scsaOnlyConfig : mainConfig;
const visibleConfig = config.filter(c => c.visible !== false);

const activeIndexForPathname = (pathname: string) =>
  visibleConfig.map(c => c.path).findLastIndex(curPath => pathname?.startsWith(curPath));

export const Navigation = () => {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(activeIndexForPathname(pathname));
  }, [pathname]);

  // Don't stay on github link, just go back, so it works like a button
  const effectiveIndex =
    activeIndex === visibleConfig.length - 1
      ? activeIndexForPathname(pathname)
      : activeIndex;

  return (
    <TabMenu
      className="text-base md:text-xl"
      model={visibleConfig.map(c => ({
        ...c,
        template: c.template
          ? c.template
          : c.path
            ? () => (
                <Link className="flex p-menuitem-link" href={c.path}>
                  {c.icon && <span className={`${c.icon} mr-2`} />}
                  <span className="hidden md:inline">{c.label}</span>
                </Link>
              )
            : undefined,
      }))}
      activeIndex={effectiveIndex}
      onTabChange={e => setActiveIndex(e.index)}
    />
  );
};
