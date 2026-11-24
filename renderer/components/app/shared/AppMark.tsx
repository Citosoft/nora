export function AppMark({
  className = "size-5 shrink-0"
}: {
  className?: string;
}) {
  return (
    <img
      src="./mark.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${className} object-contain`}
    />
  );
}
