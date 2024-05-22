import { proposalTypes } from "@/types";
import React from "react";

export type FormRow = { label: string; data: string | number | boolean };

type Props = {
  previewTitle: string;
  formRows?: FormRow[];
  title: string;
  description: string;
};

export default function FormPreview({
  title,
  description,
  previewTitle,
  formRows,
}: Props) {
  if (!formRows) return <>Error no Data</>;

  // description or covenant
  {
    /* <h3 className="text-sm font-medium leading-6 text-gray-900">
Covenant
</h3>
<p className="text-md max-h-56 overflow-y-auto rounded-xl border p-2 leading-7">
{covenant}
</p> */
  }

  return (
    <>
      <div className="divider-default divider"></div>
      <div className="px-4 sm:px-0">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-gray-500">
          {previewTitle}
        </p>
      </div>
      <div className="my-6 flex flex-col items-center">
        <h4 className="text-xl font-medium leading-6 text-gray-900">{title}</h4>
        <p className="text-md max-h-56 overflow-y-auto rounded-xl text-center leading-7">
          {description}
        </p>
      </div>
      <div className="relative">
        {formRows.map(({ label, data }, id) => (
          <React.Fragment key={label + "_" + id}>
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
