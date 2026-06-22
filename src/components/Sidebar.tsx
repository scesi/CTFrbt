"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiFolder, FiFolderMinus, FiFile, FiLock } from "react-icons/fi";

interface TreeNode {
  label: string;
  href?: string;
  icon?: "folder" | "file" | "locked";
  children?: TreeNode[];
  solved?: boolean;
}

const FILE_TREE: TreeNode[] = [
  {
    label: "challenges",
    icon: "folder",
    children: [
      { label: "web", icon: "folder", href: "/categories/web" },
      { label: "crypto", icon: "folder", href: "/categories/crypto" },
      { label: "pwn", icon: "folder", href: "/categories/pwn" },
      { label: "forensics", icon: "folder", href: "/categories/forensics" },
      { label: "reverse", icon: "folder", href: "/categories/reverse" },
      { label: "misc", icon: "folder", href: "/categories/misc" },
    ],
  },
  { label: "scoreboard", icon: "file", href: "/scoreboard" },
  { label: "rules", icon: "file", href: "/rules" },
  { label: "team", icon: "file", href: "/profile" },
];

function TreeItem({
  node,
  depth = 0,
  pathname,
}: {
  node: TreeNode;
  depth?: number;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.href === pathname;

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

  const content = (
    <div
      className={`tree-item ${isActive ? "active" : ""} ${node.solved ? "solved" : ""} ${node.icon === "locked" ? "locked" : ""}`}
      style={{ paddingLeft: `${14 + depth * 16}px` }}
      onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
      onKeyDown={
        hasChildren
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen(!isOpen);
              }
            }
          : undefined
      }
      role={hasChildren ? "button" : undefined}
      tabIndex={hasChildren ? 0 : undefined}
      aria-expanded={hasChildren ? isOpen : undefined}
    >
      <span className="tree-icon">{icon}</span>
      <span>{node.label}</span>
    </div>
  );

  return (
    <li>
      {node.href && !hasChildren ? (
        <Link href={node.href} style={{ textDecoration: "none" }}>
          {content}
        </Link>
      ) : (
        content
      )}
      {hasChildren && isOpen && (
        <ul className="file-tree">
          {node.children!.map((child) => (
            <TreeItem
              key={child.label}
              node={child}
              depth={depth + 1}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
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
          {FILE_TREE.map((node) => (
            <TreeItem key={node.label} node={node} pathname={pathname} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
