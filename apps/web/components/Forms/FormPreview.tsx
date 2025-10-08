import React, { ReactNode } from "react";
import MarkdownWrapper from "../MarkdownWrapper";
import TooltipIfOverflow from "../TooltipIfOverflow";

export type FormRow = { label: string; data: ReactNode };

type Props = {
  formRows?: FormRow[];
  title?: string;
  description?: string;
};

export function FormPreview({ title, description, formRows }: Props) {
  if (!formRows) {
    return <>Error no Data</>;
  }

  return (
    <>
      {title && description && (
        <div className="my-8 flex flex-col">
          <h3 className="mb-4">
            <TooltipIfOverflow>{title}</TooltipIfOverflow>
          </h3>

          <div className="block">
            <MarkdownWrapper source={description} />
          </div>
        </div>
      )}

      <div className="relative">
        {formRows.map(({ label, data }) => (
          <React.Fragment key={label}>
            <PreviewDataRow label={label} data={data} />
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

const PreviewDataRow = ({ label, data }: FormRow) => {
  return (
    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-lg font-medium leading-6 text-neutral-content">
        {label}
      </dt>
      <dd className="mt-1 leading-6 text-neutral-content sm:col-span-2 sm:mt-0 first-letter:capitalize">
        {data}
      </dd>
    </div>
  );
};
