"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiFolder, FiFolderMinus, FiFile, FiLock } from "react-icons/fi";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useTerminal } from "@/lib/terminal/TerminalContext";

interface TreeNode {
  label: string;
  href?: string;
  command?: string;
  icon?: "folder" | "file" | "locked";
  children?: TreeNode[];
  solved?: boolean;
}

const FILE_TREE: TreeNode[] = [
  {
    label: "challenges",
    icon: "folder",
    children: [
      { label: "web", icon: "folder", command: "ls ~/challenges/web" },
      { label: "crypto", icon: "folder", command: "ls ~/challenges/crypto" },
      { label: "pwn", icon: "folder", command: "ls ~/challenges/pwn" },
      { label: "forensics", icon: "folder", command: "ls ~/challenges/forensics" },
      { label: "reverse", icon: "folder", command: "ls ~/challenges/reverse" },
      { label: "misc", icon: "folder", command: "ls ~/challenges/misc" },
    ],
  },
  { label: "scoreboard", icon: "file", command: "scoreboard" },
  { label: "rules", icon: "file", command: "rules" },
  { label: "team", icon: "file", command: "team" },
  { label: "admin", icon: "file", href: "/admin" },
];

function TreeItem({
  node,
  depth = 0,
  pathname,
  isAdmin,
}: {
  node: TreeNode;
  depth?: number;
  pathname: string;
  isAdmin: boolean;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.href === pathname || false; // We don't really have active paths anymore for these
  
  const { status } = useSession();
  const { executeCommand } = useTerminal();
  const router = useRouter();

  const icon = hasChildren ? (
    isOpen ? (
      <FiFolderMinus size={14} />
    ) : (
      <FiFolder size={14} />
    )
  ) : node.icon === "locked" ? (
    <FiLock size={14} />
  ) : (
    <FiFile size={14} />
  );

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      setIsOpen(!isOpen);
      return;
    }

    if (node.href) {
      e.preventDefault();
      router.push(node.href);
      return;
    }

    if (node.command) {
      e.preventDefault();
      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

      if (pathname !== "/dashboard") {
        router.push("/dashboard");
        setTimeout(() => executeCommand(node.command!), 100);
      } else {
        executeCommand(node.command);
      }
    }
  };

  const content = (
    <div
      className={`tree-item ${isActive ? "active" : ""} ${node.solved ? "solved" : ""} ${node.icon === "locked" ? "locked" : ""}`}
      style={{ paddingLeft: `${14 + depth * 16}px` }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-expanded={hasChildren ? isOpen : undefined}
    >
      <span className="tree-icon" style={{ fontSize: "15px" }}>{icon}</span>
      <span style={{ fontSize: "15px" }}>{node.label}</span>
    </div>
  );

  return (
    <li>
      {content}
      {hasChildren && isOpen && (
        <ul className="file-tree">
          {node.children!.map((child) => (
            <TreeItem
              key={child.label}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = !!session?.user?.isAdmin;

  const visibleTree = FILE_TREE.filter((node) => {
    if (node.label === "admin") {
      return isAdmin;
    }

    return true;
  });

  return (
    <>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <span>Explorer</span>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="sidebar-content">
          <ul className="file-tree">
            {visibleTree.map((node) => (
              <TreeItem
                key={node.label}
                node={node}
                pathname={pathname}
                isAdmin={isAdmin}
              />
            ))}
          </ul>
        </nav>
      </aside>
      {collapsed && (
        <button
          className="sidebar-toggle floating-toggle"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          ›
        </button>
      )}
    </>
  );
}
