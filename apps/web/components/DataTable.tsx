import React from "react";

interface DataTableProps {
  title: string;
  description?: string;
  data: any[];
  columns: TableColumn[];
  footer?: React.ReactNode;
  className?: string;
}

interface TableColumn {
  header: string | React.ReactNode;
  render: (item: any) => React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  description,
  data,
  columns,
  footer,
  className = "",
}) => {
  return (
    <div className={`px-2 section-layout ${className}`}>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h3>{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-neutral-soft-content">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-neutral-soft">
              <thead>
                <tr>
                  {/*  */}
                  {columns.map((col) => (
                    <th
                      key={(col.header ?? "").toString()}
                      scope="col"
                      className={`py-3.5 pl-4 pr-3  sm:pl-0 ${col.className ?? ""}`}
                    >
                      <h5>{col.header}</h5>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-soft">
                {data.map((item) => (
                  <tr key={item.id}>
                    {columns.map((col) => (
                      <td
                        key={`${item.id}`}
                        className={`whitespace-nowrap py-5 text-sm  text-neutral-soft-content ${col.className ?? ""}`}
                      >
                        <p>{col.render(item)}</p>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {footer && (
                <tfoot>
                  <tr>
                    <td
                      className="p pt-4 sm:table-cell sm:pl-0"
                      colSpan={columns.length}
                    >
                      {footer}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
