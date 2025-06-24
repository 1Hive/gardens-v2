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
    <div className={`mt-4 ${className}`}>
      <div className="sm:flex sm:items-center py-2 sm:px-4 lg:px-6">
        <div className="sm:flex-auto">
          <h3>{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-neutral-soft-content">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flow-root">
        <div className="overflow-x-hidden max-h-[500px]">
          <div className="inline-block min-w-full py-2 align-middle sm:px-4 lg:px-6">
            <table className="min-w-full divide-y divide-neutral-soft">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={(col.header ?? "").toString()}
                      scope="col"
                      className={`py-3.5  ${col.className ?? ""}`}
                    >
                      <h5>{col.header}</h5>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data &&
                  data.map((item) => (
                    <tr key={item.id} className="even:bg-gray-50">
                      {columns.map((col, i) => (
                        <td
                          // eslint-disable-next-line react/no-array-index-key
                          key={`col-${i}-${item.id}`}
                          className={`whitespace-nowrap py-2 pr-1 text-sm text-neutral-soft-content ${col.className ?? ""}`}
                        >
                          <div className="text-base font-normal leading-6 text-left ">
                            {col.render(item)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
              {footer && (
                <tfoot>
                  <tr>
                    <td className="pt-2 sm:table-cel" colSpan={columns.length}>
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
