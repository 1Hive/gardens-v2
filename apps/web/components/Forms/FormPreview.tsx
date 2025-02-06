import React, { ReactNode } from "react";
import MarkdownWrapper from "../MarkdownWrapper";

export type FormRow = { label: string; data: ReactNode };

type Props = {
  previewTitle: string;
  formRows?: FormRow[];
  title?: string;
  description?: string;
};

export function FormPreview({
  title,
  description,
  previewTitle,
  formRows,
}: Props) {
  if (!formRows) {
    return <>Error no Data</>;
  }

  return (
    <>
      <div className="px-4 sm:px-0 mb-12 mt-16">
        <p className="subtitle font-medium">{previewTitle}</p>
      </div>
      {title && description && (
        <div className="my-8 flex flex-col">
          <h3 className="mb-4">{title}</h3>
          <MarkdownWrapper>{description}</MarkdownWrapper>
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
      <dt className="text-sm font-medium leading-6 text-gray-900">{label}</dt>
      <dd className="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
        {data}
      </dd>
    </div>
  );
};
