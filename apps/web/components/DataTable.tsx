import React from "react";
import { Modal } from "./Modal";

interface DataTableProps {
  title?: string;
  description?: string;
  data: any[] | undefined;
  columns: TableColumn[];
  footer?: React.ReactNode;
  className?: string;
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
  withModal?: boolean;
}

interface TableColumn {
  header: string | React.ReactNode;
  render: (item: any) => React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  data,
  columns,
  footer,
  openModal,
  setOpenModal,
  withModal = true,
}) => {
  const content = (
    <div
      className={`overflow-x-hidden max-h-[750px] ${withModal ? "" : "section-layout"} `}
    >
      <div className="inline-block min-w-full py-2 align-middle sm:px-4 lg:px-6">
        {!withModal && title && <h5 className="mb-4">{title}</h5>}

        <table className="min-w-full">
          <thead className="sticky top-0 bg-none backdrop-blur-sm z-10">
            <tr className="uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={(col.header ?? "").toString()}
                  scope="col"
                  className={`py-2.5 sm:py-3.5 px-[1px] ${col.className ?? ""}`}
                >
                  <h6 className="text-xs sm:text-sm text-neutral-soft-content ">
                    {col.header}
                  </h6>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data?.map((item) => (
              <tr key={item.id}>
                {columns.map((col, i) => (
                  <td
                    key={`col-${i + 1}-${item.id}`}
                    className={`whitespace-nowrap py-1 pr-1  ${col.className ?? ""}`}
                  >
                    <div className="text-xs sm:text-sm font-normal leading-6 ">
                      {col.render(item)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {!withModal && footer != null && (
            <tfoot className="border-t-[1px] border-neutral-soft-content/50 mt-2">
              <tr>
                <td className="pt-4 sm:table-cell" colSpan={columns.length}>
                  {footer}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  if (!withModal) {
    return content;
  }

  return (
    <Modal
      title={title}
      footer={footer}
      isOpen={openModal}
      onClose={() => setOpenModal(false)}
      size="ultra-large"
    >
      {content}
    </Modal>
  );
};
