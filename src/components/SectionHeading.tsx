import Link from "next/link";

type Props = {
  title: string;
  live?: boolean;
  action?: { href: string; label: string };
  id?: string;
};

export function SectionHeading({ title, live = false, action, id }: Props) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="display flex items-center gap-2 text-[17px]">
        {live ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent blink" /> : null}
        {title}
      </h2>
      {action ? (
        <Link href={action.href} className="buy">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
