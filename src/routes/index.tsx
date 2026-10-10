import { useClips } from "@/hooks/use-clips";
// ...
function Index() {
  const { data: remote = [] } = useClips();
  const all = useMemo(() => [...remote, ...clips], [remote]);

  const filtered = useMemo(
    () => all.filter((c) =>
      (active === "الكل" || c.category === active) &&
      (c.title.includes(query) || c.author.includes(query))),
    [all, query, active],
  );
  // ...
}
