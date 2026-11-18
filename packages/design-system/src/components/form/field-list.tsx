"use client";

import { useId, type ComponentProps, type ReactElement, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type RefCallBack,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "#lib/cn";

import { Checkbox } from "../base/checkbox/checkbox";
import { Combobox, type ComboboxBaseProps, type ComboboxOption } from "../base/combobox/combobox";
import { Field } from "../base/field/field";
import { FieldError, FieldHint } from "../base/field/field-message";
import { Input, type InputProps } from "../base/input/input";
import { Label } from "../base/label/label";
import { PhoneInput, type PhoneInputProps } from "../base/phone-input/phone-input";
import { Radio, RadioGroup } from "../base/radio-group/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../base/select/select";
import { Switch } from "../base/switch/switch";
import { TagsInput, type TagsInputProps } from "../base/tags-input/tags-input";
import { Textarea, type TextareaProps } from "../base/textarea/textarea";

export interface FieldOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

/** Props the form owns. They are left out of every field's `props` so they cannot be overridden. */
type Controlled =
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onChange"
  | "checked"
  | "defaultChecked"
  | "onCheckedChange"
  | "name"
  | "id";

/** What each `type` renders, and the `props` it accepts. */
export interface FieldTypes {
  /** A single-line `Input`. Pass `type`, `prepend`, `append`, `currency` or `formatter` in `props`. */
  input: Omit<InputProps, Controlled>;
  textarea: Omit<TextareaProps, Controlled>;
  /** A `PhoneInput`. The value is the full international number, such as `+442079460958`. */
  phone: Omit<PhoneInputProps, Controlled>;
  /** A `Select` for a short fixed list. */
  select: { options: readonly FieldOption[]; placeholder?: string; disabled?: boolean };
  /** A searchable `Combobox`: fixed or server-loaded options. Add `multiple` for several values. */
  combobox: Omit<ComboboxBaseProps<ComboboxOption, string, unknown>, Controlled> & {
    multiple?: boolean;
  };
  /** A `TagsInput` for several free-text values. */
  tags: Omit<TagsInputProps, Controlled>;
  /** A `RadioGroup`, for four or fewer options. */
  radio: { options: readonly FieldOption[]; disabled?: boolean; className?: string };
  checkbox: Omit<ComponentProps<typeof Checkbox>, Controlled>;
  switch: Omit<ComponentProps<typeof Switch>, Controlled>;
}

export type FieldType = keyof FieldTypes;

interface FieldBase<Values extends FieldValues> {
  /** The path of the value in the form, checked against the form's type: `"email"`, `"address.city"`. */
  name: FieldPath<Values>;
  label: ReactNode;
  /** Help shown under the control. */
  hint?: ReactNode;
  /** Shows the asterisk and marks the control as required. Validation itself comes from the schema. */
  required?: boolean;
  /** Leaves the field out, for example depending on another value. */
  hidden?: boolean;
  /** Classes for the field's cell in the grid, such as `sm:col-span-2`. */
  className?: string;
}

type TypedField<Values extends FieldValues> = {
  [Type in FieldType]: FieldBase<Values> & { type: Type } & (Record<
      string,
      never
    > extends FieldTypes[Type]
      ? { props?: FieldTypes[Type] }
      : { props: FieldTypes[Type] });
}[FieldType];

export interface FieldRenderContext<
  Values extends FieldValues,
  Name extends FieldPath<Values> = FieldPath<Values>,
> {
  /** `value`, `onChange`, `onBlur`, `name` and `ref` from React Hook Form. */
  field: ControllerRenderProps<Values, Name>;
  fieldState: ControllerFieldState;
}

/**
 * Any control at all. `render` returns one element; label, hint and error are added
 * around it. `field.value` has the type of the value at `name`.
 */
type CustomField<Values extends FieldValues> = {
  [Name in FieldPath<Values>]: Omit<FieldBase<Values>, "name"> & {
    name: Name;
    type: "custom";
    render: (context: FieldRenderContext<Values, Name>) => ReactElement;
  };
}[FieldPath<Values>];

export type FieldItem<Values extends FieldValues> = TypedField<Values> | CustomField<Values>;

export interface FieldListProps<Values extends FieldValues> extends ComponentProps<"div"> {
  /** `form.control` from `useForm`. */
  control: Control<Values>;
  fields: readonly FieldItem<Values>[];
  /** How many columns from the `sm` breakpoint up. Fields stack in one column below it. */
  columns?: 1 | 2 | 3;
  /** Disables every field, for example while the form is submitting. */
  disabled?: boolean;
}

const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** A checkbox or switch sits beside its label instead of under it. */
function InlineField<Values extends FieldValues>({
  item,
  error,
  children,
}: {
  item: FieldBase<Values>;
  error: string | undefined;
  children: (accessibility: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = item.hint === undefined ? undefined : `${id}-hint`;
  const errorId = error === undefined ? undefined : `${id}-error`;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-3">
        {children({
          id,
          "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
          "aria-invalid": error === undefined ? undefined : true,
        })}
        <Label htmlFor={id}>
          {item.label}
          {item.required ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : null}
        </Label>
      </div>
      {item.hint === undefined ? null : <FieldHint id={hintId}>{item.hint}</FieldHint>}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

interface FieldControlProps<Values extends FieldValues> {
  item: FieldItem<Values>;
  field: Omit<ControllerRenderProps<Values, FieldPath<Values>>, "ref">;
  /** React Hook Form's ref callback, which lets it focus the first invalid control. */
  controlRef: RefCallBack;
  fieldState: ControllerFieldState;
  disabled: boolean;
}

function FieldControl<Values extends FieldValues>({
  item,
  field,
  controlRef,
  fieldState,
  disabled,
}: FieldControlProps<Values>) {
  const error = fieldState.error?.message;
  const off = disabled || field.disabled === true;
  const wrapper = {
    label: item.label,
    ...(item.hint === undefined ? {} : { hint: item.hint }),
    ...(error === undefined ? {} : { error }),
    ...(item.required === undefined ? {} : { required: item.required }),
  };

  switch (item.type) {
    case "input":
      return (
        <Field {...wrapper}>
          <Input
            {...item.props}
            ref={controlRef}
            name={field.name}
            value={text(field.value)}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            disabled={off || item.props?.disabled === true}
          />
        </Field>
      );
    case "phone":
      return (
        <Field {...wrapper}>
          <PhoneInput
            {...item.props}
            ref={controlRef}
            name={field.name}
            value={text(field.value)}
            onValueChange={(value) => {
              field.onChange(value);
            }}
            onBlur={field.onBlur}
            disabled={off || item.props?.disabled === true}
          />
        </Field>
      );
    case "textarea":
      return (
        <Field {...wrapper}>
          <Textarea
            {...item.props}
            ref={controlRef}
            name={field.name}
            value={text(field.value)}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={off || item.props?.disabled === true}
          />
        </Field>
      );
    case "select":
      return (
        <Select
          name={field.name}
          value={text(field.value)}
          onValueChange={field.onChange}
          disabled={off || item.props.disabled === true}
        >
          <Field {...wrapper}>
            <SelectTrigger ref={controlRef} onBlur={field.onBlur}>
              <SelectValue placeholder={item.props.placeholder} />
            </SelectTrigger>
          </Field>
          <SelectContent>
            {item.props.options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                {...(option.disabled === undefined ? {} : { disabled: option.disabled })}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "combobox": {
      const { multiple = false, disabled: fieldDisabled, ...rest } = item.props ?? {};
      const shared = {
        name: field.name,
        onBlur: field.onBlur,
        disabled: off || fieldDisabled === true,
      };
      return (
        <Field {...wrapper}>
          {multiple ? (
            <Combobox
              {...rest}
              {...shared}
              multiple
              value={list(field.value)}
              onValueChange={field.onChange}
            />
          ) : (
            <Combobox
              {...rest}
              {...shared}
              value={text(field.value) === "" ? null : text(field.value)}
              onValueChange={(value) => {
                field.onChange(value ?? "");
              }}
            />
          )}
        </Field>
      );
    }
    case "tags":
      return (
        <Field {...wrapper}>
          <TagsInput
            {...item.props}
            ref={controlRef}
            name={field.name}
            value={list(field.value)}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            disabled={off || item.props?.disabled === true}
          />
        </Field>
      );
    case "radio":
      return (
        <fieldset
          className="grid gap-2"
          aria-invalid={error === undefined ? undefined : true}
          disabled={off || item.props.disabled === true}
        >
          <legend className="mb-2 text-sm font-medium">
            {item.label}
            {item.required ? (
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            ) : null}
          </legend>
          <RadioGroup
            ref={controlRef}
            name={field.name}
            value={text(field.value)}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            className={item.props.className}
          >
            {item.props.options.map((option) => (
              <Label key={option.value} className="font-normal">
                <Radio
                  value={option.value}
                  {...(option.disabled === undefined ? {} : { disabled: option.disabled })}
                />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
          {item.hint === undefined ? null : <FieldHint>{item.hint}</FieldHint>}
          <FieldError>{error}</FieldError>
        </fieldset>
      );
    case "checkbox":
      return (
        <InlineField item={item} error={error}>
          {(accessibility) => (
            <Checkbox
              {...item.props}
              {...accessibility}
              ref={controlRef}
              name={field.name}
              checked={field.value === true}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
              }}
              onBlur={field.onBlur}
              disabled={off || item.props?.disabled === true}
            />
          )}
        </InlineField>
      );
    case "switch":
      return (
        <InlineField item={item} error={error}>
          {(accessibility) => (
            <Switch
              {...item.props}
              {...accessibility}
              ref={controlRef}
              name={field.name}
              checked={field.value === true}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              disabled={off || item.props?.disabled === true}
            />
          )}
        </InlineField>
      );
    case "custom": {
      // Each custom item's `render` is typed for its own `name`; here the name is only known as a path.
      const render = item.render as (context: FieldRenderContext<Values>) => ReactElement;
      return (
        <Field {...wrapper}>{render({ field: { ...field, ref: controlRef }, fieldState })}</Field>
      );
    }
  }
}

/**
 * Builds the fields of a form from a list. Each item names a value in the form,
 * gives it a label and picks a control by `type`; the value, change handler and
 * validation error are wired to React Hook Form for you.
 *
 * It renders the fields only. The `<form>`, the submit button and `useForm` (with
 * your Zod schema as its resolver) stay in your code.
 */
export function FieldList<Values extends FieldValues>({
  control,
  fields,
  columns = 1,
  disabled = false,
  className,
  ...props
}: FieldListProps<Values>) {
  return (
    <div data-slot="field-list" className={cn("grid gap-5", grid[columns], className)} {...props}>
      {fields
        .filter((item) => item.hidden !== true)
        .map((item) => (
          <div key={item.name} data-field={item.name} className={cn("min-w-0", item.className)}>
            <Controller
              control={control}
              name={item.name}
              render={({ field: { ref, ...field }, fieldState }) => (
                <FieldControl
                  item={item}
                  field={field}
                  controlRef={ref}
                  fieldState={fieldState}
                  disabled={disabled}
                />
              )}
            />
          </div>
        ))}
    </div>
  );
}
