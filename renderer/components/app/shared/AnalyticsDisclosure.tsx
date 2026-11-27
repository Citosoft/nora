import { ANALYTICS_DISCLOSURE } from "@/components/app/constants/analyticsDisclosure";

type AnalyticsDisclosureProps = {
  /** Which levels to describe; the prompt in a consent region describes both as one opt-in. */
  sections: ReadonlyArray<{ title: string; items: readonly string[] }>;
};

export function AnalyticsDisclosure({ sections }: AnalyticsDisclosureProps) {
  return (
    <div className="space-y-3 text-sm">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <div className="font-medium text-foreground">{section.title}</div>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {section.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ))}
      <p className="text-muted-foreground">{ANALYTICS_DISCLOSURE.never}</p>
      <p className="text-muted-foreground">{ANALYTICS_DISCLOSURE.storage}</p>
    </div>
  );
}
