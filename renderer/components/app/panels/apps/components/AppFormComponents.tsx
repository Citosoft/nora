import { useId } from "react";
import type { ComponentFn } from "@json-render/react";
import { useBoundProp } from "@json-render/react";
import type { AppCatalog } from "@shared/apps/catalog";
import { propChoice, propNumber, propText } from "@/components/app/logic/apps/propText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BUTTON_VARIANTS = { primary: "default", secondary: "secondary", outline: "outline", ghost: "ghost", destructive: "outline" } as const;
const label = "text-xs font-medium text-muted-foreground";

export const AppForm: ComponentFn<AppCatalog, "Form"> = ({ props, children }) =>
  <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
    {propText(props.title) && <h3 className="text-sm font-semibold">{propText(props.title)}</h3>}{children}</form>;

export const AppInput: ComponentFn<AppCatalog, "Input"> = ({ props, bindings }) => {
  const id = useId();
  const [value, setValue] = useBoundProp<string>(typeof props.value === "string" ? props.value : undefined, bindings?.value);
  return <div className="flex flex-col gap-1">
    <label htmlFor={id} className={label}>{propText(props.label)}</label>
    <Input id={id} type={propChoice(props.type, ["text", "email", "number", "date"], "text")} placeholder={propText(props.placeholder)} value={value ?? ""} onChange={(event) => setValue(event.target.value)} className="h-9 text-sm" />
  </div>;
};

export const AppTextarea: ComponentFn<AppCatalog, "Textarea"> = ({ props, bindings }) => {
  const id = useId();
  const [value, setValue] = useBoundProp<string>(typeof props.value === "string" ? props.value : undefined, bindings?.value);
  return <div className="flex flex-col gap-1">
    <label htmlFor={id} className={label}>{propText(props.label)}</label>
    <Textarea id={id} rows={propNumber(props.rows, 4)} placeholder={propText(props.placeholder)} value={value ?? ""} onChange={(event) => setValue(event.target.value)} className="text-sm" />
  </div>;
};

export const AppSelect: ComponentFn<AppCatalog, "Select"> = ({ props, bindings }) => {
  const [value, setValue] = useBoundProp<string>(typeof props.value === "string" ? props.value : undefined, bindings?.value);
  const options = Array.isArray(props.options) ? props.options.flatMap((entry) => entry && typeof entry === "object" && typeof entry.value === "string"
    ? [{ value: entry.value, label: typeof entry.label === "string" ? entry.label : entry.value }] : []) : [];
  const name = propText(props.label);
  return <div className="flex flex-col gap-1">
    <span className={label}>{name}</span>
    <Select aria-label={name} value={value ?? ""} onChange={(event) => setValue(event.target.value)} className="h-9 text-sm">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select>
  </div>;
};

export const AppCheckbox: ComponentFn<AppCatalog, "Checkbox"> = ({ props, bindings }) => {
  const id = useId();
  const [checked, setChecked] = useBoundProp<boolean>(typeof props.checked === "boolean" ? props.checked : undefined, bindings?.checked);
  return <label htmlFor={id} className="flex items-center gap-2 text-sm">
    <input id={id} type="checkbox" className="size-4 accent-primary" checked={!!checked} onChange={(event) => setChecked(event.target.checked)} />{propText(props.label)}
  </label>;
};

export const AppButton: ComponentFn<AppCatalog, "Button"> = ({ props, on }) => {
  const press = on("press");
  const variant = propChoice(props.variant, ["primary", "secondary", "outline", "ghost", "destructive"], "secondary");
  return <Button type="button" size="sm" variant={BUTTON_VARIANTS[variant]} className={cn("w-fit", variant === "destructive" && "text-destructive")} onClick={() => press.emit()}>{propText(props.label)}</Button>;
};
