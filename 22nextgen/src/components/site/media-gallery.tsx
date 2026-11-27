import { MediaImage } from "./media";

export function MediaGallery({ items }: { items: { path: string; alt?: string }[] }) {
  return (
    <section aria-labelledby="gallery">
      <h2 id="gallery" className="display-xl mb-6 text-4xl">Gallery</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((g) => (
          <li key={g.path} className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <MediaImage path={g.path} alt={g.alt ?? ""} sizes="(min-width: 640px) 25vw, 50vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
