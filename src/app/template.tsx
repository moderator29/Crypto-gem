/** Re-mounts on every navigation, so each page enters with the same short, calm rise. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
