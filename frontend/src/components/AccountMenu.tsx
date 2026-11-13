import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import SiteIcon from "./SiteIcon";

export default function AccountMenu({ nickname, canChooseNickname, chooseNickname, isAdmin }: {
  nickname: string | null;
  canChooseNickname: boolean;
  chooseNickname: () => void;
  isAdmin: boolean;
}) {
  const { signOut } = useAuth();
  return <Menu as="div" className="hq-account">
    <Menu.Button className="hq-account-button" aria-label="Account menu">
      <span className="hq-avatar">{(nickname || "U").slice(0, 1).toUpperCase()}</span>
      <span className="hq-account-name">{nickname || "My account"}</span><SiteIcon name="chevron" />
    </Menu.Button>
    <Transition as={Fragment} enter="transition duration-100 ease-out" enterFrom="opacity-0" enterTo="opacity-100"
      leave="transition duration-75 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
      <Menu.Items className="hq-account-menu">
        <Menu.Item><Link className="hq-menu-item" to="/profile"><SiteIcon name="chart" />My results</Link></Menu.Item>
        {canChooseNickname && <Menu.Item><button className="hq-menu-item" onClick={chooseNickname}><SiteIcon name="user" />Choose nickname</button></Menu.Item>}
        {isAdmin && <Menu.Item><Link className="hq-menu-item" to="/admin/questions"><SiteIcon name="settings" />Admin</Link></Menu.Item>}
        <div className="hq-menu-divider" />
        <Menu.Item><button className="hq-menu-item" onClick={() => signOut()}><SiteIcon name="logout" />Log out</button></Menu.Item>
      </Menu.Items>
    </Transition>
  </Menu>;
}
