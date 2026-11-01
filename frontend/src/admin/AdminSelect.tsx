import type { ComponentPropsWithoutRef } from "react";
import SiteIcon from "../components/SiteIcon";
import "./admin-select.css";

/** Keep the platform picker and keyboard behavior; only replace its decoration. */
export default function AdminSelect(props: ComponentPropsWithoutRef<"select">) {
  return (
    <span className="hq-admin-select">
      <select {...props} />
      <SiteIcon name="chevron" />
    </span>
  );
}
