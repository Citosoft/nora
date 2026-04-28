export function AppMark({
  className = "size-5 shrink-0"
}: {
  className?: string;
}) {
  return (
    <img
      src="./icon.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${className} object-contain`}
    />
  );
}
